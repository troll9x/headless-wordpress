<?php
declare(strict_types=1);

// Run locally: php scripts/test-wpx-fulltext-ranking.php
// This tests finite PHP arithmetic and source shape, not MariaDB FULLTEXT.
// The 2026-10-13 live CMS query still overflowed at phr_score / 64e0.
$source = file_get_contents(__DIR__ . '/../release/wpx-fulltext/wpcode-snippet-50120.php');
if ($source === false) {
    throw new RuntimeException('WPCode snippet source is missing');
}

function check(bool $condition, string $message): void {
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

check(str_contains($source, 'public function rest_search(WP_REST_Request $r)'), 'Search handler missing');
check(str_contains($source, 'MATCH(idx.title,idx.content,idx.slug,idx.keywords,idx.plain) AGAINST (%s IN BOOLEAN MODE) AS phr_score'), 'Phrase score source changed');

// The original expression overflows at this valid finite DOUBLE input.
$large = 2.0e307;
check(is_infinite($large * 10.0), 'Overflow fixture no longer reproduces');

$expectedTerms = [
    'rec_linear*80 / 64e0',
    'phr_score / 64e0 * 10',
    'phr_plain_score / 64e0 * 6',
    'exact_content_hit*2 / 64e0',
    'popularity_score / 64e0',
    'ft_score / 64e0',
];
foreach ($expectedTerms as $term) {
    check(str_contains($source, $term), "Unsafe or missing ranking term: {$term}");
}
check(!str_contains($source, '+ phr_score*10'), 'Unsafe phrase multiplication remains');

// 64 exceeds the total FULLTEXT weights (10+6+1), so even three DBL_MAX
// scores cannot overflow their weighted sum after division.
$max = PHP_FLOAT_MAX;
$boundary = ($max / 64.0 * 10.0) + ($max / 64.0 * 6.0) + ($max / 64.0);
check(is_finite($boundary), 'Scaled FULLTEXT boundary must remain finite');

$score = static fn(array $r): float => $r['rec'] * 80.0 / 64.0
    + $r['phrase'] / 64.0 * 10.0
    + $r['plain'] / 64.0 * 6.0
    + $r['content'] * 2.0 / 64.0
    + $r['popularity'] / 64.0
    + $r['ft'] / 64.0;
$unscaled = static fn(array $r): float => $r['rec'] * 80.0
    + $r['phrase'] * 10.0 + $r['plain'] * 6.0
    + $r['content'] * 2.0 + $r['popularity'] + $r['ft'];

$cases = [
    ['name' => 'water', 'rec' => 0.4, 'phrase' => 5.0, 'plain' => 5.0, 'content' => 1, 'popularity' => 1.0, 'ft' => 8.0],
    ['name' => 'VI có dấu', 'rec' => 0.7, 'phrase' => 4.0, 'plain' => 3.0, 'content' => 1, 'popularity' => 0.0, 'ft' => 6.0],
    ['name' => 'VI không dấu', 'rec' => 0.5, 'phrase' => 0.0, 'plain' => 4.0, 'content' => 0, 'popularity' => 0.0, 'ft' => 4.0],
    ['name' => 'EN phrase', 'rec' => 0.9, 'phrase' => 2.0, 'plain' => 2.0, 'content' => 1, 'popularity' => 2.0, 'ft' => 3.0],
];
foreach ($cases as $case) {
    check(abs($score($case) * 64.0 - $unscaled($case)) < 1e-10, "Ranking weights changed: {$case['name']}");
}
for ($i = 0; $i < count($cases); $i++) {
    for ($j = $i + 1; $j < count($cases); $j++) {
        check(($score($cases[$i]) <=> $score($cases[$j])) === ($unscaled($cases[$i]) <=> $unscaled($cases[$j])), 'Ordinary result order changed');
    }
}
$hugeA = ['rec' => 0, 'phrase' => $large, 'plain' => $large, 'content' => 0, 'popularity' => 0, 'ft' => $large];
$hugeB = ['rec' => 0, 'phrase' => $large / 2, 'plain' => $large / 2, 'content' => 0, 'popularity' => 0, 'ft' => $large / 2];
check(is_finite($score($hugeA)) && $score($hugeA) > $score($hugeB), 'Large-score order is invalid');

echo "WPX arithmetic fixtures PASS (live MariaDB query failed separately)\n";
