<?php
/**
 * WPCode PHP snippet: classic drag-and-drop menus for the headless frontend.
 * WPCode removes the opening PHP tag when the snippet is pasted into its editor.
 */

if (!defined('ABSPATH')) {
    exit;
}

function tlu_headless_register_menu_locations() {
    register_nav_menus(array(
        'primary' => 'Header / Primary',
        'topbar' => 'Top bar',
    ));
}
add_action('after_setup_theme', 'tlu_headless_register_menu_locations', 20);
if (did_action('after_setup_theme')) {
    tlu_headless_register_menu_locations();
}

function tlu_headless_menu_items($menu_id) {
    $posts = wp_get_nav_menu_items($menu_id, array('post_status' => 'publish'));
    if (!is_array($posts)) {
        return array();
    }

    $items = array();
    foreach ($posts as $post) {
        if (!$post instanceof WP_Post) {
            continue;
        }
        $url = esc_url_raw((string) $post->url);
        if ('' === $url || !preg_match('#^https?://#i', $url)) {
            continue;
        }
        $items[] = array(
            'id' => (int) $post->ID,
            'parent' => (int) $post->menu_item_parent,
            'title' => wp_strip_all_tags((string) $post->title),
            'url' => $url,
            'description' => sanitize_text_field((string) $post->description),
            'type' => sanitize_key((string) $post->type),
            'object' => sanitize_key((string) $post->object),
            'object_id' => (int) $post->object_id,
            'target' => '_blank' === $post->target ? '_blank' : '',
            'classes' => array_values(array_filter(array_map('sanitize_html_class', (array) $post->classes))),
            'menu_order' => (int) $post->menu_order,
        );
    }
    return $items;
}

function tlu_headless_menu_response(WP_REST_Request $request) {
    $location = sanitize_key((string) $request->get_param('location'));
    $slug = sanitize_title((string) $request->get_param('slug'));
    $lang = sanitize_key((string) $request->get_param('lang'));
    if (!in_array($lang, array('', 'vi', 'en'), true)) {
        return new WP_Error('tlu_menu_language', 'Invalid language.', array('status' => 400));
    }
    if ('' === $location && '' === $slug) {
        return new WP_Error('tlu_menu_parameter', 'Specify location or slug.', array('status' => 400));
    }

    $menu = null;
    if ('' !== $location) {
        $locations = get_nav_menu_locations();
        $keys = '' !== $lang ? array($location . '___' . $lang) : array($location);
        // Polylang filters get_nav_menu_locations() for the REST lang and
        // exposes the translated menu under the unsuffixed base location.
        $keys[] = $location;
        foreach ($keys as $key) {
            if (!empty($locations[$key])) {
                $menu = wp_get_nav_menu_object((int) $locations[$key]);
                if ($menu && !is_wp_error($menu)) {
                    if ('' !== $lang && function_exists('pll_get_term_language')) {
                        $menu_lang = pll_get_term_language((int) $menu->term_id);
                        if ($menu_lang && $menu_lang !== $lang) {
                            $menu = null;
                            continue;
                        }
                    }
                    break;
                }
            }
        }
    } else {
        $menu = wp_get_nav_menu_object($slug);
        if ($menu && !is_wp_error($menu) && '' !== $lang && function_exists('pll_get_term')) {
            $translation_id = pll_get_term((int) $menu->term_id, $lang);
            $menu = $translation_id ? wp_get_nav_menu_object((int) $translation_id) : null;
        }
    }

    $found = $menu && !is_wp_error($menu);
    return rest_ensure_response(array(
        'location' => $location,
        'lang' => $lang,
        'id' => $found ? (int) $menu->term_id : 0,
        'name' => $found ? sanitize_text_field((string) $menu->name) : '',
        'slug' => $found ? sanitize_title((string) $menu->slug) : '',
        'items' => $found ? tlu_headless_menu_items((int) $menu->term_id) : array(),
    ));
}

add_action('rest_api_init', function () {
    register_rest_route('headless/v1', '/menus', array(
        'methods' => WP_REST_Server::READABLE,
        'callback' => 'tlu_headless_menu_response',
        'permission_callback' => '__return_true',
    ), true);
}, 50);
