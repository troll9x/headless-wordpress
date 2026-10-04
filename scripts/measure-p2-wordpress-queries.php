<?php
/**
 * Read-only WP-CLI probe: wp eval-file scripts/measure-p2-wordpress-queries.php
 * Run from the WordPress installation with --path=... and the Headless API active.
 * Set SAVEQUERIES in staging wp-config.php to include summed SQL time.
 */

use TLU_Headless_API\Services\DocumentService;
use TLU_Headless_API\Services\OrganizationService;

if ( ! defined( 'ABSPATH' ) || ! class_exists( DocumentService::class ) || ! class_exists( OrganizationService::class ) ) {
	throw new RuntimeException( 'Run with WP-CLI after loading WordPress and Headless API.' );
}

global $wpdb;
$cases = [
	'documents-root' => static fn() => ( new DocumentService() )->get_category_archive( 'van-ban-tai-lieu', 'vi', 1, 6 ),
	'documents-child' => static fn() => ( new DocumentService() )->get_category_archive( 'van-ban-cua-dang', 'vi', 1, 6 ),
	'organization-board' => static fn() => ( new OrganizationService() )->get_by_category( 'ban-giam-hieu', 'vi' ),
];

foreach ( $cases as $label => $run ) {
	for ( $pass = 1; $pass <= 2; $pass++ ) {
		$before_queries = (int) $wpdb->num_queries;
		$before_logged = is_array( $wpdb->queries ?? null ) ? count( $wpdb->queries ) : 0;
		$started = hrtime( true );
		$result = $run();
		$milliseconds = ( hrtime( true ) - $started ) / 1_000_000;
		$sql_queries = (int) $wpdb->num_queries - $before_queries;
		$sql_milliseconds = null;
		if ( defined( 'SAVEQUERIES' ) && SAVEQUERIES && is_array( $wpdb->queries ?? null ) ) {
			$sql_milliseconds = 1000 * array_sum( array_column( array_slice( $wpdb->queries, $before_logged ), 1 ) );
		}
		$state = is_wp_error( $result ) ? $result->get_error_code() : 'ok';
		printf(
			"%s pass=%d state=%s total_ms=%.1f sql_queries=%d sql_ms=%s\n",
			$label,
			$pass,
			$state,
			$milliseconds,
			$sql_queries,
			null === $sql_milliseconds ? 'n/a' : number_format( $sql_milliseconds, 1, '.', '' )
		);
	}
}
