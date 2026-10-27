<?php
declare(strict_types=1);

// Run: php scripts/test-wpx-fulltext-ranking.php
// Local arithmetic/source checks only; the current candidate has not passed live MariaDB SQL.
$source = file_get_contents(__DIR__ . '/../release/wpx-fulltext/wpcode-snippet-50120.php');
if ($source === false) throw new RuntimeException('WPCode snippet source is missing');

function check(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}

check(str_contains($source, 'public function rest_search(WP_REST_Request $r)'), 'Search handler missing');
foreach (['LEAST(phr_score, 1e6)*10', 'LEAST(phr_plain_score, 1e6)*6', 'LEAST(ft_score, 1e6)'] as $term) {
    check(str_contains($source, $term), "Missing bounded FULLTEXT term: {$term}");
}
check(!str_contains($source, 'phr_score / 64e0'), 'Rejected division candidate remains');
check(!str_contains($source, '+ phr_score*10'), 'Original overflowing multiplication remains');

$max = PHP_FLOAT_MAX;
check(is_infinite($max * 10.0), 'DBL_MAX fixture must reproduce original overflow');
$cap = static fn(float $value): float => min($value, 1.0e6);
$rank = static fn(array $r): float => $r['rec'] * 80.0
    + $cap($r['phrase']) * 10.0 + $cap($r['plain']) * 6.0
    + $r['content'] * 2.0 + $r['popularity'] + $cap($r['ft']);
$original = static fn(array $r): float => $r['rec'] * 80.0
    + $r['phrase'] * 10.0 + $r['plain'] * 6.0
    + $r['content'] * 2.0 + $r['popularity'] + $r['ft'];

$ordinary = [
    ['rec'=>0.4,'phrase'=>5.0,'plain'=>5.0,'content'=>1,'popularity'=>1.0,'ft'=>8.0],
    ['rec'=>0.7,'phrase'=>4.0,'plain'=>3.0,'content'=>1,'popularity'=>0.0,'ft'=>6.0],
    ['rec'=>0.5,'phrase'=>0.0,'plain'=>4.0,'content'=>0,'popularity'=>0.0,'ft'=>4.0],
];
foreach ($ordinary as $r) check($rank($r) === $original($r), 'Ordinary ranking changed');

$saturated = ['rec'=>0.2,'phrase'=>$max,'plain'=>$max,'content'=>0,'popularity'=>0.0,'ft'=>$max];
$newer = $saturated;
$newer['rec'] = 0.9;
check(is_finite($rank($saturated)), 'Saturated FULLTEXT rank overflowed');
check($rank($newer) > $rank($saturated), 'Recency tie-break was lost');
$oneLess = $saturated;
$oneLess['phrase'] = 10.0;
check($rank($saturated) > $rank($oneLess), 'Phrase boost order was lost');

echo "WPX ranking fixtures PASS\n";
