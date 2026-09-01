<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class BackupController extends Controller
{
    private const DIR = 'backups';

    public function index(Request $request): Response
    {
        $this->authorizeBackups($request);

        $backups = collect(Storage::disk('local')->files(self::DIR))
            ->filter(fn (string $path) => str_ends_with($path, '.zip'))
            ->map(fn (string $path) => [
                'name'       => basename($path),
                'size'       => Storage::disk('local')->size($path),
                'created_at' => date('Y-m-d H:i', Storage::disk('local')->lastModified($path)),
            ])
            ->sortByDesc('created_at')
            ->values();

        return Inertia::render('Settings/Backup/Index', compact('backups'));
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorizeBackups($request);
        abort_if(DB::connection()->getDriverName() !== 'mysql', 422, 'Backups are only supported for MySQL databases.');

        Storage::disk('local')->makeDirectory(self::DIR);

        $timestamp = now()->format('Y-m-d_His');
        $sqlPath = Storage::disk('local')->path(self::DIR."/tmp_{$timestamp}.sql");
        $zipPath = Storage::disk('local')->path(self::DIR."/backup_{$timestamp}.zip");

        set_time_limit(300);

        try {
            $this->dumpDatabaseTo($sqlPath);
        } catch (\Throwable $e) {
            @unlink($sqlPath);
            return back()->with('error', "Backup failed: {$e->getMessage()}");
        }

        $database = DB::connection()->getDatabaseName();
        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFile($sqlPath, "{$database}_{$timestamp}.sql");
        $zip->close();

        @unlink($sqlPath);

        return back()->with('success', 'Backup created.');
    }

    public function download(Request $request, string $filename): StreamedResponse
    {
        $this->authorizeBackups($request);

        $filename = basename($filename);
        abort_unless(Storage::disk('local')->exists(self::DIR."/{$filename}"), 404);

        return Storage::disk('local')->download(self::DIR."/{$filename}");
    }

    public function destroy(Request $request, string $filename): RedirectResponse
    {
        $this->authorizeBackups($request);

        $filename = basename($filename);
        Storage::disk('local')->delete(self::DIR."/{$filename}");

        return back()->with('success', 'Backup deleted.');
    }

    private function authorizeBackups(Request $request): void
    {
        abort_unless($request->user()->can('manage settings'), 403);
    }

    /**
     * Writes a plain-SQL dump of every table (schema + data) using Laravel's own
     * DB connection, rather than shelling out to mysqldump — which on Windows can
     * fail with a Winsock init error (10106) depending on how the web server
     * process was launched, unrelated to the database itself being reachable.
     */
    private function dumpDatabaseTo(string $sqlPath): void
    {
        $database = DB::connection()->getDatabaseName();
        $pdo = DB::connection()->getPdo();

        // Schema::getTables() isn't reliable here: on this shared MySQL server it can
        // return tables from every database the connection's user can see, not just
        // the current one. SHOW TABLES is correctly scoped to the active database.
        $tables = collect(DB::select('SHOW TABLES'))
            ->map(fn ($row) => array_values((array) $row)[0]);

        $handle = fopen($sqlPath, 'w');
        fwrite($handle, "-- MRS Meat Trading backup — {$database} — ".now()."\n");
        fwrite($handle, "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n");

        foreach ($tables as $table) {
            $createRow = DB::selectOne("SHOW CREATE TABLE `{$table}`");
            $createSql = $createRow->{'Create Table'};

            fwrite($handle, "DROP TABLE IF EXISTS `{$table}`;\n{$createSql};\n\n");

            $rows = DB::table($table)->get();
            if ($rows->isEmpty()) {
                continue;
            }

            $columns = array_keys((array) $rows->first());
            $columnList = implode('`, `', $columns);

            $lines = $rows->map(function ($row) use ($columns, $pdo) {
                $values = array_map(function (string $col) use ($row, $pdo) {
                    $value = $row->$col;
                    return $value === null ? 'NULL' : $pdo->quote((string) $value);
                }, $columns);
                return '('.implode(', ', $values).')';
            });

            foreach ($lines->chunk(500) as $batch) {
                fwrite($handle, "INSERT INTO `{$table}` (`{$columnList}`) VALUES\n".$batch->implode(",\n").";\n\n");
            }
        }

        fwrite($handle, "SET FOREIGN_KEY_CHECKS=1;\n");
        fclose($handle);
    }
}
