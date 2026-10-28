<?php
declare(strict_types=1);

/** Chiamata server-side a Google Gemini (la chiave API non lascia mai il server). */
final class Gemini
{
    public static function generate(string $prompt): string
    {
        $key = trim((string) Config::get('gemini_api_key', ''));
        if ($key === '') {
            throw new ApiException(503, 'ai-disabled', 'Analisi AI non configurata sul server (gemini_api_key in config.php).');
        }
        if (strlen($prompt) > 200000) {
            throw new ApiException(413, 'prompt-too-large', 'Richiesta troppo lunga.');
        }
        if (!function_exists('curl_init')) {
            throw new ApiException(500, 'curl-missing', 'Estensione cURL non disponibile sul server.');
        }
        $model = preg_replace('/[^A-Za-z0-9._\-]/', '', (string) Config::get('gemini_model', 'gemini-3-flash-preview'));
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent';

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'x-goog-api-key: ' . $key],
            CURLOPT_POSTFIELDS => json_encode(['contents' => [['parts' => [['text' => $prompt]]]]], JSON_UNESCAPED_UNICODE),
        ]);
        $resp = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($resp === false) {
            error_log('GESDI gemini curl: ' . $err);
            throw new ApiException(502, 'ai-unreachable', 'Servizio di analisi non raggiungibile.');
        }
        $json = json_decode((string) $resp, true);
        if ($code !== 200 || !is_array($json)) {
            error_log('GESDI gemini http ' . $code . ': ' . substr((string) $resp, 0, 500));
            throw new ApiException(502, 'ai-error', 'Il servizio di analisi ha restituito un errore (' . $code . ').');
        }
        $text = '';
        foreach (($json['candidates'][0]['content']['parts'] ?? []) as $part) {
            if (isset($part['text']) && is_string($part['text'])) {
                $text .= $part['text'];
            }
        }
        if ($text === '') {
            throw new ApiException(502, 'ai-empty', "L'API ha restituito una risposta vuota.");
        }
        return $text;
    }
}
