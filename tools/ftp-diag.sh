#!/usr/bin/env bash
# Diagnostica FTP: scrive nelle "annotazioni" della run cosa vede l'account FTP
# (cartella iniziale e contenuto). Non stampa password. Usato solo se il deploy fallisce.
set -u
SSL="--ssl"; [ "${FTP_PROTOCOL:-ftps}" = "ftp" ] && SSL=""
base="ftp://${FTP_SERVER}"
run() { curl -sS $SSL --connect-timeout 20 --user "${FTP_USERNAME}:${FTP_PASSWORD}" "$@" 2>&1 | tr '\r\n' '  ' | cut -c1-900; }
note() { echo "::notice title=$1::$2"; }
note "FTP PWD" "$(run -Q 'PWD' --list-only "$base/")"
note "FTP radice" "$(run --list-only "$base/")"
d="${FTP_SERVER_DIR#./}"; d="${d#/}"
note "FTP server-dir ('${d}')" "$(run --list-only "$base/${d}")"
note "FTP vvf" "$(run --list-only "$base/vvf/")"
