<?php
declare(strict_types=1);

/**
 * Regole di sicurezza lato server.
 *
 * L'app originale si fidava del browser (qualunque utente poteva scrivere
 * ovunque). Ora il server protegge almeno ciò che riguarda identità e privilegi:
 * utenti (staff), ruoli personalizzati ed elenco amministratori. Tutto il resto
 * resta accessibile a qualunque utente autenticato, come nell'app originale.
 */
final class Policy
{
    private const BUILTIN_LEVELS = ['super-admin' => 4, 'admin' => 3, 'manager' => 2, 'standard' => 1];

    /** @var array<string,int> */
    private static array $roleCache = [];

    public static function roleLevel(mixed $role): int
    {
        $role = is_string($role) && $role !== '' ? $role : 'standard';
        if (isset(self::BUILTIN_LEVELS[$role])) {
            return self::BUILTIN_LEVELS[$role];
        }
        if (isset(self::$roleCache[$role])) {
            return self::$roleCache[$role];
        }
        $level = 1;
        if (strlen($role) <= 100 && !preg_match('/[\/\x00-\x1f]/', $role)) {
            $doc = Store::loadDoc('custom_roles', $role);
            if ($doc !== null && isset($doc['data']->level) && is_numeric($doc['data']->level)) {
                $level = max(1, min(4, (int) $doc['data']->level));
            }
        }
        return self::$roleCache[$role] = $level;
    }

    public static function userLevel(stdClass $staffData): int
    {
        return self::roleLevel($staffData->role ?? null);
    }

    public static function isHash(string $value): bool
    {
        return (bool) preg_match('/^\$(2[aby]|argon2id?)\$/', $value);
    }

    /** Normalizza i dati in ingresso prima della scrittura (gestione password). */
    public static function prepare(string $c, string $id, stdClass $w, ?stdClass $existing): void
    {
        if ($c !== 'staff' || (string) ($w->op ?? '') === 'delete') {
            return;
        }
        $data = $w->data ?? null;
        if (!($data instanceof stdClass)) {
            return;
        }
        // Campo calcolato in uscita: non va mai salvato.
        unset($data->hasPassword);

        if (property_exists($data, 'password')) {
            $pw = $data->password;
            if ($pw === null || $pw === '') {
                $data->password = '';
            } elseif (is_string($pw)) {
                if (!self::isHash($pw)) {
                    $data->password = password_hash($pw, PASSWORD_DEFAULT);
                }
            } else {
                throw new ApiException(422, 'bad-password', 'Password non valida.');
            }
        } elseif ((string) ($w->op ?? '') === 'set' && empty($w->merge) && $existing !== null && isset($existing->password)) {
            // Un "set" completo non deve cancellare la password che il client non vede mai.
            $data->password = $existing->password;
        }
    }

    /** Rimuove dai dati in uscita ciò che il browser non deve vedere. */
    public static function sanitizeOut(string $c, stdClass $data): stdClass
    {
        if ($c !== 'staff') {
            return $data;
        }
        $out = clone $data;
        $has = isset($out->password) && is_string($out->password) && $out->password !== '';
        unset($out->password);
        $out->hasPassword = $has;
        return $out;
    }

    /**
     * @param array{id:string,data:stdClass} $actor
     * @throws ApiException 403 se non consentito
     */
    public static function authorize(array $actor, string $c, string $id, string $op, ?stdClass $existing, ?stdClass $new): void
    {
        $myLevel = self::userLevel($actor['data']);

        if (!Modules::isEnabled($c)) {
            self::deny('Modulo non attivo per questa sede.');
        }

        switch ($c) {
            case 'admins':
                if ($myLevel < 4) {
                    self::deny('Solo il Super Admin può gestire l\'elenco amministratori.');
                }
                return;

            case 'custom_roles':
                if ($myLevel < 3) {
                    self::deny('Permessi insufficienti per gestire i ruoli.');
                }
                $oldLevel = $existing !== null && isset($existing->level) ? (int) $existing->level : 0;
                $newLevel = $new !== null && isset($new->level) ? (int) $new->level : 0;
                if ($oldLevel > $myLevel || $newLevel > $myLevel) {
                    self::deny('Non puoi gestire un ruolo di livello superiore al tuo.');
                }
                return;

            case 'staff':
                self::authorizeStaff($actor, $myLevel, $id, $op, $existing, $new);
                return;

            default:
                self::authorizeByTable($c, $myLevel, $existing, $new);
                return;
        }
    }

    /**
     * Livello minimo richiesto per creare / modificare / eliminare, per collezione.
     * Rispecchia i permessi che l'interfaccia già applicava (pannello Admin dal livello 2,
     * chiusure mensili, lavanderia e reset presenze dal livello 3): ora li fa rispettare il server.
     * Le collezioni non elencate restano aperte a tutti gli utenti collegati
     * (vendite al bar, presenze, prenotazioni, interventi, giochi, promemoria...).
     */
    private const TABLE_RULES = [
        //                           creare modificare eliminare
        'settings'                => [2, 2, 3],
        'products'                => [2, 2, 2],
        'orders'                  => [1, 2, 3],
        'cash_movements'          => [1, 2, 3],
        'vehicles'                => [2, 2, 3],
        'operational_vehicles'    => [2, 2, 3],
        'intervention_typologies' => [2, 2, 2],
        'duty_officers'           => [2, 2, 2],
        'laundry_items'           => [2, 2, 2],
        'laundry_shipments'       => [3, 1, 3],
        'monthly_closures'        => [3, 3, 3],
        'attendance'              => [1, 1, 3],
        'interventions'           => [1, 1, 3],
    ];

    private static function authorizeByTable(string $c, int $myLevel, ?stdClass $existing, ?stdClass $new): void
    {
        $rule = self::TABLE_RULES[$c] ?? null;
        if ($rule === null) {
            return;
        }
        if ($new === null) {
            $need = $rule[2];
        } elseif ($existing === null) {
            $need = $rule[0];
        } else {
            $need = $rule[1];
        }
        if ($myLevel >= $need) {
            return;
        }
        // Eccezione: chi vende al bar scala le scorte (campo "stock") senza poter cambiare il resto del prodotto.
        if ($c === 'products' && $existing !== null && $new !== null && self::onlyStockChanged($existing, $new)) {
            return;
        }
        self::deny('Permessi insufficienti per questa operazione.');
    }

    private static function onlyStockChanged(stdClass $old, stdClass $new): bool
    {
        $keys = array_unique(array_merge(array_keys(get_object_vars($old)), array_keys(get_object_vars($new))));
        foreach ($keys as $k) {
            if ($k === 'stock') {
                continue;
            }
            if (json_encode($old->$k ?? null) !== json_encode($new->$k ?? null)) {
                return false;
            }
        }
        return true;
    }

    private static function authorizeStaff(array $actor, int $myLevel, string $id, string $op, ?stdClass $existing, ?stdClass $new): void
    {
        $isSelf = $id === $actor['id'];

        if ($op === 'delete') {
            if ($existing === null) {
                return;
            }
            if ($isSelf) {
                self::deny('Non puoi eliminare il tuo stesso utente.');
            }
            if ($myLevel < 2 || self::userLevel($existing) > $myLevel) {
                self::deny('Permessi insufficienti per eliminare questo utente.');
            }
            return;
        }

        if ($new === null) {
            return;
        }
        $newLevel = self::userLevel($new);

        if ($existing === null) {
            // Creazione nuovo utente.
            if ($myLevel < 2 || $newLevel > $myLevel) {
                self::deny('Permessi insufficienti per creare questo utente.');
            }
            return;
        }

        $oldLevel = self::userLevel($existing);
        $oldRole = (string) ($existing->role ?? 'standard');
        $newRole = (string) ($new->role ?? 'standard');

        if ($isSelf && $myLevel < 2) {
            // Utente standard: può modificare solo il proprio profilo, senza cambiare ruolo.
            if ($newRole !== $oldRole) {
                self::deny('Non puoi cambiare il tuo ruolo.');
            }
            return;
        }

        if ($myLevel >= 2) {
            if ($oldLevel > $myLevel || $newLevel > $myLevel) {
                self::deny('Non puoi modificare utenti o ruoli di livello superiore al tuo.');
            }
            return;
        }

        self::deny('Permessi insufficienti per modificare questo utente.');
    }

    private static function deny(string $msg): never
    {
        throw new ApiException(403, 'forbidden', $msg);
    }
}
