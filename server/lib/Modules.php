<?php
declare(strict_types=1);

/**
 * Moduli (strumenti) attivabili per sede.
 *
 * Un modulo spento: l'interfaccia lo nasconde; il server restituisce vuote le sue collezioni
 * in lettura e rifiuta le scritture (Policy). Presenze, impostazioni, utenti e promemoria
 * sono sempre attivi.
 */
final class Modules
{
    /** id => [etichetta, collezioni, moduli richiesti] */
    public const DEFS = [
        'bar'                  => ['Bar e casse', ['products', 'orders', 'cash_movements'], []],
        'games'                => ['Giochi (tombola, analotto, lotteria, dadi)', ['tombola', 'tombola_tickets', 'tombola_wins', 'analotto', 'analotto_bets', 'analotto_extractions', 'lottery_tickets'], ['bar']],
        'calendar'             => ['Calendario turni', [], []],
        'vehicle_booking'      => ['Prenotazione mezzi', ['vehicles', 'vehicle_bookings'], []],
        'operational_vehicles' => ['Mezzi operativi e controlli', ['operational_vehicles', 'vehicle_checks'], []],
        'laundry'              => ['Lavanderia', ['laundry_items', 'laundry_entries', 'laundry_shipments'], []],
        'interventions'        => ['Interventi', ['interventions', 'intervention_typologies', 'duty_officers'], []],
    ];

    /** @var array<string,string>|null collezione => modulo */
    private static ?array $owner = null;

    private static function owner(): array
    {
        if (self::$owner === null) {
            self::$owner = [];
            foreach (self::DEFS as $id => $def) {
                foreach ($def[1] as $c) {
                    self::$owner[$c] = $id;
                }
            }
        }
        return self::$owner;
    }

    /** @return array<string,bool> tutti attivi */
    public static function allOn(): array
    {
        return array_fill_keys(array_keys(self::DEFS), true);
    }

    /** La collezione è utilizzabile nella sede corrente? */
    public static function isEnabled(string $collection): bool
    {
        $module = self::owner()[$collection] ?? null;
        if ($module === null) {
            return true;
        }
        $cfg = Tenant::config();
        if ($cfg === null) {
            return true;
        }
        return ($cfg['modules'][$module] ?? true) === true;
    }

    /**
     * Normalizza i moduli ricevuti: solo id noti, valori booleani, dipendenze rispettate.
     * @return array<string,bool>
     */
    public static function normalize(mixed $raw, bool $strict): array
    {
        $out = self::allOn();
        if (is_array($raw)) {
            foreach ($raw as $id => $v) {
                if (!isset(self::DEFS[$id])) {
                    if ($strict) {
                        throw new ApiException(422, 'bad-module', 'Modulo sconosciuto: ' . (string) $id);
                    }
                    continue;
                }
                $out[$id] = $v === true || $v === 1 || $v === '1' || $v === 'true';
            }
        }
        foreach (self::DEFS as $id => $def) {
            foreach ($def[2] as $need) {
                if ($out[$id] && !$out[$need]) {
                    if ($strict) {
                        throw new ApiException(422, 'module-dependency', '"' . $def[0] . '" richiede "' . self::DEFS[$need][0] . '".');
                    }
                    $out[$id] = false;
                }
            }
        }
        return $out;
    }
}
