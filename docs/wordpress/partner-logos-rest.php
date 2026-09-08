<?php
/**
 * Public, read-only REST endpoint for the ACF partner-logo repeater.
 *
 * Add this snippet to Code Snippets and enable it site-wide.
 * Endpoint: GET /wp-json/tlu/v1/partner-logos
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'rest_api_init',
	static function (): void {
		register_rest_route(
			'tlu/v1',
			'/partner-logos',
			[
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => '__return_true',
				'callback'            => static function (): WP_REST_Response {
					if ( ! function_exists( 'get_field' ) ) {
						return new WP_REST_Response( [ 'items' => [] ], 200 );
					}

					$rows  = get_field( 'danh_sach_doi_tac', 'option' );
					$items = [];

					foreach ( is_array( $rows ) ? $rows : [] as $index => $row ) {
						if ( ! is_array( $row ) ) {
							continue;
						}

						$image     = $row['logo_cong_ty'] ?? null;
						$image_id  = 0;
						$image_url = '';
						$image_alt = '';
						$title     = '';

						if ( is_array( $image ) ) {
							$image_id  = (int) ( $image['ID'] ?? $image['id'] ?? 0 );
							$image_url = (string) ( $image['url'] ?? '' );
							$image_alt = (string) ( $image['alt'] ?? '' );
							$title     = (string) ( $image['title'] ?? '' );
						} elseif ( is_numeric( $image ) ) {
							$image_id  = (int) $image;
							$image_url = (string) wp_get_attachment_image_url( $image_id, 'full' );
							$image_alt = (string) get_post_meta( $image_id, '_wp_attachment_image_alt', true );
							$title     = (string) get_the_title( $image_id );
						} elseif ( is_string( $image ) ) {
							$image_url = $image;
						}

						$image_url = esc_url_raw( $image_url );
						if ( '' === $image_url ) {
							continue;
						}

						$items[] = [
							'logo_cong_ty' => [
								'id'    => $image_id ?: null,
								'url'   => $image_url,
								'alt'   => sanitize_text_field( $image_alt ),
								'title' => sanitize_text_field( $title ?: sprintf( 'Logo đối tác %d', $index + 1 ) ),
							],
							'link_doi_tac' => esc_url_raw( (string) ( $row['link_doi_tac'] ?? '' ) ),
						];
					}

					$response = new WP_REST_Response( [ 'items' => $items ], 200 );
					$response->header( 'Cache-Control', 'public, max-age=60, s-maxage=300' );
					return $response;
				},
			],
		);
	}
);
