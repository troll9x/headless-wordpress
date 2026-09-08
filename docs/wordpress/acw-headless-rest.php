<?php
/**
 * Headless REST adapter for AutoRecursiveCategoryWidget.
 *
 * Code Snippets: copy the code below this opening PHP tag and append it to the
 * existing ACW snippet. The original snippet must remain active because this
 * adapter reuses ACW_OPTION_KEY, acw_get_root_config() and its saved option.
 */

if (!defined('ABSPATH')) {
    exit;
}

function acw_rest_term_payload($term, $config, &$visited)
{
    $term_id = (int) $term->term_id;
    if (isset($visited[$term_id])) {
        return null;
    }

    $visited[$term_id] = true;
    $children = acw_rest_build_children($term_id, $config, $visited);
    unset($visited[$term_id]);

    return array(
        'type' => 'term',
        'id' => $term_id,
        'parent' => (int) $term->parent,
        'name' => acw_get_term_label($term, $config),
        'slug' => (string) $term->slug,
        'url' => get_category_link($term_id),
        'children' => $children,
    );
}

function acw_rest_custom_payload($item)
{
    return array(
        'type' => 'custom',
        'label' => sanitize_text_field($item['label'] ?? ''),
        'url' => esc_url_raw($item['url'] ?? ''),
        'children' => array(),
    );
}

function acw_rest_build_children($parent_id, $config, &$visited)
{
    $parent_id = (int) $parent_id;
    $items = array();
    $mixed = !empty($config['level3_mix'][$parent_id])
        ? (array) $config['level3_mix'][$parent_id]
        : array();
    $excluded = array_map('intval', (array) ($config['exclude_level3'] ?? array()));

    if (!empty($mixed)) {
        foreach ($mixed as $item) {
            if (!is_array($item) || empty($item['type'])) {
                continue;
            }

            if ($item['type'] === 'term' && !empty($item['id'])) {
                $term = get_category((int) $item['id']);
                if (!$term || is_wp_error($term) || in_array((int) $term->term_id, $excluded, true)) {
                    continue;
                }
                $payload = acw_rest_term_payload($term, $config, $visited);
                if ($payload) {
                    $items[] = $payload;
                }
            } elseif ($item['type'] === 'custom' && !empty($item['label']) && !empty($item['url'])) {
                $items[] = acw_rest_custom_payload($item);
            }
        }

        return $items;
    }

    $children = get_categories(array(
        'taxonomy' => 'category',
        'parent' => $parent_id,
        'hide_empty' => false,
        'orderby' => 'name',
        'order' => 'ASC',
    ));

    foreach ((array) $children as $term) {
        if (in_array((int) $term->term_id, $excluded, true)) {
            continue;
        }
        $payload = acw_rest_term_payload($term, $config, $visited);
        if ($payload) {
            $items[] = $payload;
        }
    }

    foreach ((array) ($config['custom_level3'][$parent_id] ?? array()) as $item) {
        if (!empty($item['label']) && !empty($item['url'])) {
            $items[] = acw_rest_custom_payload($item);
        }
    }

    return $items;
}

function acw_rest_build_root_items($root_id, $config)
{
    $items = array();
    $visited = array();
    $mixed = (array) ($config['level2_mix'] ?? array());
    $excluded = array_map('intval', (array) ($config['exclude_level2'] ?? array()));

    if (!empty($mixed)) {
        foreach ($mixed as $item) {
            if (!is_array($item) || empty($item['type'])) {
                continue;
            }

            if ($item['type'] === 'term' && !empty($item['id'])) {
                $term = get_category((int) $item['id']);
                if (!$term || is_wp_error($term) || in_array((int) $term->term_id, $excluded, true)) {
                    continue;
                }
                $payload = acw_rest_term_payload($term, $config, $visited);
                if ($payload) {
                    $items[] = $payload;
                }
            } elseif ($item['type'] === 'custom' && !empty($item['label']) && !empty($item['url'])) {
                $items[] = acw_rest_custom_payload($item);
            }
        }

        return $items;
    }

    $terms = get_categories(array(
        'taxonomy' => 'category',
        'parent' => (int) $root_id,
        'hide_empty' => false,
        'orderby' => 'name',
        'order' => 'ASC',
    ));

    $positions = array();
    foreach ((array) ($config['order_level2'] ?? array()) as $index => $term_id) {
        $positions[(int) $term_id] = (int) $index;
    }

    if (!empty($positions)) {
        usort($terms, function ($left, $right) use ($positions) {
            $left_id = (int) $left->term_id;
            $right_id = (int) $right->term_id;
            $left_has = isset($positions[$left_id]);
            $right_has = isset($positions[$right_id]);
            if ($left_has && $right_has) {
                return $positions[$left_id] <=> $positions[$right_id];
            }
            if ($left_has) {
                return -1;
            }
            if ($right_has) {
                return 1;
            }
            return strcasecmp($left->name, $right->name);
        });
    }

    foreach ((array) $terms as $term) {
        if (in_array((int) $term->term_id, $excluded, true)) {
            continue;
        }
        $payload = acw_rest_term_payload($term, $config, $visited);
        if ($payload) {
            $items[] = $payload;
        }
    }

    foreach ((array) ($config['custom_level2'] ?? array()) as $item) {
        if (!empty($item['label']) && !empty($item['url'])) {
            $items[] = acw_rest_custom_payload($item);
        }
    }

    return $items;
}

function acw_rest_resolve_category(WP_REST_Request $request)
{
    $language = sanitize_key((string) $request->get_param('lang'));
    $category = null;
    $post_id = absint($request->get_param('post_id'));
    $category_id = absint($request->get_param('category_id'));
    $category_slug = sanitize_title((string) $request->get_param('category_slug'));

    if ($post_id > 0) {
        if ($language && function_exists('pll_get_post')) {
            $translated_post_id = pll_get_post($post_id, $language);
            if ($translated_post_id) {
                $post_id = (int) $translated_post_id;
            }
        }
        $categories = get_the_category($post_id);
        $category = !empty($categories) ? $categories[0] : null;
    } elseif ($category_id > 0) {
        $category = get_category($category_id);
    } elseif ($category_slug !== '') {
        $category = get_term_by('slug', $category_slug, 'category');
    }

    if (!$category || is_wp_error($category)) {
        return new WP_Error('acw_category_not_found', 'Không tìm thấy danh mục cho sidebar.', array('status' => 404));
    }

    if ($language && function_exists('pll_get_term')) {
        $translated_id = pll_get_term((int) $category->term_id, $language);
        if ($translated_id) {
            $translated = get_category((int) $translated_id);
            if ($translated && !is_wp_error($translated)) {
                $category = $translated;
            }
        }
    }

    return $category;
}

function acw_rest_get_sidebar(WP_REST_Request $request)
{
    $category = acw_rest_resolve_category($request);
    if (is_wp_error($category)) {
        return $category;
    }

    $ancestors = get_ancestors((int) $category->term_id, 'category');
    $root = !empty($ancestors) ? get_category((int) end($ancestors)) : $category;
    if (!$root || is_wp_error($root)) {
        return new WP_Error('acw_root_not_found', 'Không tìm thấy danh mục gốc.', array('status' => 404));
    }

    $config = acw_get_root_config((int) $root->term_id);

    return rest_ensure_response(array(
        'root' => array(
            'id' => (int) $root->term_id,
            'name' => (string) $root->name,
            'slug' => (string) $root->slug,
            'url' => get_category_link((int) $root->term_id),
        ),
        'items' => acw_rest_build_root_items((int) $root->term_id, $config),
    ));
}

add_action('rest_api_init', function () {
    register_rest_route('acw/v1', '/sidebar', array(
        'methods' => WP_REST_Server::READABLE,
        'callback' => 'acw_rest_get_sidebar',
        'permission_callback' => '__return_true',
        'args' => array(
            'post_id' => array('type' => 'integer', 'minimum' => 1),
            'category_id' => array('type' => 'integer', 'minimum' => 1),
            'category_slug' => array('type' => 'string'),
            'lang' => array('type' => 'string', 'enum' => array('vi', 'en')),
        ),
    ));
});
