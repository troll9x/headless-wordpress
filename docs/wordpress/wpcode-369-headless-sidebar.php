if (!defined('ACW_OPTION_KEY'))
    define('ACW_OPTION_KEY', 'auto_cat_widget_config');

function acw_get_root_config($root_id)
{
    $all = get_option(ACW_OPTION_KEY, array());
    $defaults = array(
        'order_level2' => array(),
        'exclude_level2' => array(),
        'exclude_level3' => array(),
        'labels' => array(),
        'custom_level2' => array(),
        'custom_level3' => array(),
        'level2_mix' => array(),
        'level3_mix' => array(),
    );
    return (isset($all[$root_id]) && is_array($all[$root_id])) ? array_merge($defaults, $all[$root_id]) : $defaults;
}
function acw_get_term_label($term, $config)
{
    $id = (int) $term->term_id;
    return (!empty($config['labels'][$id])) ? $config['labels'][$id] : $term->name;
}

add_action('admin_menu', function () {
    add_menu_page('Menu Sidebar Danh má»¥c', 'Sidebar Danh má»¥c', 'manage_options', 'acw-sidebar-menus', 'acw_render_admin_page_mix', 'dashicons-list-view', 58);
});
add_action('admin_enqueue_scripts', function ($hook) {
    if (strpos($hook, 'acw-sidebar-menus') === false) return;

    wp_enqueue_script('jquery-ui-sortable');

    $css = <<<'CSS'
.acw-card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:16px;margin-top:16px}
.acw-flex{display:flex;gap:16px;align-items:flex-start}
.acw-col{flex:1}
.acw-handle{cursor:move;margin-right:8px;color:#777}
.acw-muted{color:#666;font-size:12px}
.acw-level2-mix{border:1px dashed #e1e1e1;padding:10px;border-radius:8px;background:#fafafa}
.acw-mix-item{display:grid;grid-template-columns:24px 1fr 240px 70px 60px;gap:10px;align-items:center;background:#fff;border:1px solid #eee;border-radius:6px;padding:8px;margin-bottom:8px}
.acw-mix-item.custom{grid-template-columns:24px 1fr 1fr 60px}
.acw-mix-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.acw-remove{color:#a00}
@media (max-width:1100px){
  .acw-mix-item{grid-template-columns:24px 1fr 1fr 70px 60px}
}
CSS;

    $js = <<<'JS'
jQuery(function($){
    function makeSortable(){ $('.acw-level2-mix').sortable({ handle: '.acw-handle', items: '.acw-mix-item' }); }
    makeSortable();
    $(document).on('click','.acw-add-custom-l2',function(){
        var tpl = $('<li class="acw-mix-item custom" data-type="custom">\
            <span class="dashicons dashicons-move acw-handle"></span>\
            <input type="text" class="acw-mix-label" placeholder="TÃªn hiá»ƒn thá»‹">\
            <input type="url" class="acw-mix-url" placeholder="URL">\
            <a href="#" class="acw-remove">XÃ³a</a>\
        </li>');
        $('#acw-level2-mix').append(tpl);
    });
    $(document).on('click','.acw-add-custom-l3',function(){
        var target = $(this).data('target');
        var tpl = $('<li class="acw-mix-item custom" data-type="custom">\
            <span class="dashicons dashicons-move acw-handle"></span>\
            <input type="text" class="acw-mix-label" placeholder="TÃªn hiá»ƒn thá»‹">\
            <input type="url" class="acw-mix-url" placeholder="URL">\
            <a href="#" class="acw-remove">XÃ³a</a>\
        </li>');
        $(target).append(tpl);
    });
    $(document).on('click','.acw-remove',function(e){ e.preventDefault(); $(this).closest('.acw-mix-item').remove(); });
    $('#acw-form').on('submit', function(){
        var mix = [];
        $('#acw-level2-mix .acw-mix-item').each(function(){
            var type = $(this).data('type');
            if(type==='term'){
                mix.push({type:'term', id: parseInt($(this).data('termid'),10)});
            }else{
                var label = $('.acw-mix-label',this).val().trim();
                var url   = $('.acw-mix-url',this).val().trim();
                if(label && url){ mix.push({type:'custom', label:label, url:url}); }
            }
        });
        $('#acw-level2-mix-json').val(JSON.stringify(mix));
        var l3 = {};
        $('.acw-level3-mix').each(function(){
            var pid = $(this).data('parent');
            var arr = [];
            $(this).find('.acw-mix-item').each(function(){
                var type = $(this).data('type');
                if(type==='term'){
                    arr.push({type:'term', id: parseInt($(this).data('termid'),10)});
                }else{
                    var label = $('.acw-mix-label',this).val().trim();
                    var url   = $('.acw-mix-url',this).val().trim();
                    if(label && url){ arr.push({type:'custom', label:label, url:url}); }
                }
            });
            l3[pid] = arr;
        });
        $('#acw-level3-mix-json').val(JSON.stringify(l3));
    });
});
JS;

    if (!wp_style_is('acw-admin-inline', 'registered')) {
        wp_register_style('acw-admin-inline', false, [], '1.0');
    }
    wp_enqueue_style('acw-admin-inline');
    wp_add_inline_style('acw-admin-inline', $css);
    wp_add_inline_script('jquery-ui-sortable', $js);
});


function acw_render_admin_page_mix()
{
    if (!current_user_can('manage_options'))
        return;
    if (!empty($_POST['acw_save']) && check_admin_referer('acw_save_nonce')) {
        $root_id = isset($_POST['root_id']) ? intval($_POST['root_id']) : 0;
        $exclude_level2 = isset($_POST['exclude_level2']) ? array_map('intval', (array) $_POST['exclude_level2']) : array();
        $exclude_level3 = isset($_POST['exclude_level3']) ? array_map('intval', (array) $_POST['exclude_level3']) : array();
        $label_override = isset($_POST['label_override']) && is_array($_POST['label_override']) ? $_POST['label_override'] : array();

        $level2_mix = array();
        if (!empty($_POST['level2_mix_json'])) {
            $decoded = json_decode(stripslashes($_POST['level2_mix_json']), true);
            if (is_array($decoded)) {
                foreach ($decoded as $it) {
                    if (!is_array($it) || empty($it['type']))
                        continue;
                    if ($it['type'] === 'term' && isset($it['id'])) {
                        $level2_mix[] = array('type' => 'term', 'id' => intval($it['id']));
                    } elseif ($it['type'] === 'custom' && !empty($it['label']) && !empty($it['url'])) {
                        $level2_mix[] = array('type' => 'custom', 'label' => sanitize_text_field($it['label']), 'url' => esc_url_raw($it['url']));
                    }
                }
            }
        }
        $order_level2 = array();
        $custom_level2 = array();
        foreach ($level2_mix as $it) {
            if ($it['type'] === 'term')
                $order_level2[] = (int) $it['id'];
            elseif ($it['type'] === 'custom')
                $custom_level2[] = $it;
        }

        $level3_mix = array();
        if (!empty($_POST['level3_mix_json'])) {
            $decoded3 = json_decode(stripslashes($_POST['level3_mix_json']), true);
            if (is_array($decoded3)) {
                foreach ($decoded3 as $pid => $arr) {
                    $pid = intval($pid);
                    if (!is_array($arr))
                        continue;
                    $tmp = array();
                    foreach ($arr as $it) {
                        if ($it['type'] === 'term' && isset($it['id']))
                            $tmp[] = array('type' => 'term', 'id' => intval($it['id']));
                        elseif ($it['type'] === 'custom' && !empty($it['label']) && !empty($it['url']))
                            $tmp[] = array('type' => 'custom', 'label' => sanitize_text_field($it['label']), 'url' => esc_url_raw($it['url']));
                    }
                    $level3_mix[$pid] = $tmp;
                }
            }
        }
        $custom_level3 = array();
        foreach ($level3_mix as $pid => $arr) {
            foreach ($arr as $it) {
                if ($it['type'] === 'custom')
                    $custom_level3[$pid][] = $it;
            }
        }

        $all = get_option(ACW_OPTION_KEY, array());
        if ($root_id > 0) {
            $exclude_level2 = array_values(array_unique($exclude_level2));
            $exclude_level3 = array_values(array_unique($exclude_level3));
            $existing_labels = (isset($all[$root_id]['labels']) && is_array($all[$root_id]['labels'])) ? $all[$root_id]['labels'] : array();
            foreach ($label_override as $tid => $val) {
                $tid = intval($tid);
                $val = sanitize_text_field(wp_unslash($val));
                if ($val !== '')
                    $existing_labels[$tid] = $val;
                else
                    unset($existing_labels[$tid]);
            }
            $all[$root_id] = array(
                'order_level2' => $order_level2,
                'exclude_level2' => $exclude_level2,
                'exclude_level3' => $exclude_level3,
                'labels' => $existing_labels,
                'custom_level2' => $custom_level2,
                'custom_level3' => $custom_level3,
                'level2_mix' => $level2_mix,
                'level3_mix' => $level3_mix,
            );
            update_option(ACW_OPTION_KEY, $all);
            echo '<div class="updated"><p>ÄÃ£ lÆ°u cáº¥u hÃ¬nh cho danh má»¥c gá»‘c ID ' . esc_html($root_id) . '.</p></div>';
        }
    }

    $selected_root = isset($_GET['root_id']) ? intval($_GET['root_id']) : 0;
    $roots = get_categories(array('taxonomy' => 'category', 'parent' => 0, 'hide_empty' => false, 'orderby' => 'name', 'order' => 'ASC'));
    echo '<div class="wrap"><h1>Menu Sidebar Danh má»¥c</h1>';
    echo '<form method="get"><input type="hidden" name="page" value="acw-sidebar-menus">';
    echo '<p><label><strong>Chá»n danh má»¥c gá»‘c:</strong> ';
    echo '<select name="root_id" onchange="this.form.submit()"><option value="0">-- Chá»n --</option>';
    foreach ($roots as $r) {
        echo '<option value="' . esc_attr($r->term_id) . '"' . selected($selected_root, $r->term_id, false) . '>' . esc_html($r->name) . ' (ID:' . $r->term_id . ')</option>';
    }
    echo '</select></label></p></form>';

    if ($selected_root > 0) {
        $cfg = acw_get_root_config($selected_root);
        $level2_terms = get_categories(array('taxonomy' => 'category', 'parent' => $selected_root, 'hide_empty' => false, 'orderby' => 'name', 'order' => 'ASC'));
        $terms_by_id = array();
        foreach ($level2_terms as $t)
            $terms_by_id[(int) $t->term_id] = $t;

        $mix_for_view = array();
        if (!empty($cfg['level2_mix'])) {
            foreach ($cfg['level2_mix'] as $it) {
                if ($it['type'] === 'term' && isset($terms_by_id[(int) $it['id']])) {
                    $mix_for_view[] = array('type' => 'term', 'term' => $terms_by_id[(int) $it['id']]);
                    unset($terms_by_id[(int) $it['id']]);
                } elseif ($it['type'] === 'custom') {
                    $mix_for_view[] = array('type' => 'custom', 'label' => $it['label'], 'url' => $it['url']);
                }
            }
            foreach ($terms_by_id as $t)
                $mix_for_view[] = array('type' => 'term', 'term' => $t);
        } else {
            foreach ($level2_terms as $t)
                $mix_for_view[] = array('type' => 'term', 'term' => $t);
            if (!empty($cfg['custom_level2']))
                foreach ($cfg['custom_level2'] as $it)
                    $mix_for_view[] = array('type' => 'custom', 'label' => $it['label'], 'url' => $it['url']);
        }

        echo '<div class="acw-card"><h2>Quáº£n lÃ½ menu cá»§a: ' . esc_html(get_cat_name($selected_root)) . ' (ID: ' . $selected_root . ')</h2>';
        echo '<form id="acw-form" method="post">';
        wp_nonce_field('acw_save_nonce');
        echo '<input type="hidden" name="root_id" value="' . esc_attr($selected_root) . '">';
        echo '<input type="hidden" name="level2_mix_json" id="acw-level2-mix-json">';
        echo '<input type="hidden" name="level3_mix_json" id="acw-level3-mix-json">';
        echo '<div class="acw-flex">';

        echo '<div class="acw-col"><h3>' . esc_html(get_cat_name($selected_root)) . '</h3>';
        echo '<ul id="acw-level2-mix" class="acw-level2-mix">';
        foreach ($mix_for_view as $row) {
            if ($row['type'] === 'term') {
                $t2 = $row['term'];
                $checked = in_array((int) $t2->term_id, $cfg['exclude_level2'], true) ? 'checked' : '';
                $curr_label = $cfg['labels'][$t2->term_id] ?? '';
                echo '<li class="acw-mix-item" data-type="term" data-termid="' . esc_attr($t2->term_id) . '">';
                echo '<span class="dashicons dashicons-move acw-handle"></span>';
                echo '<span class="acw-mix-title"><strong>' . esc_html($t2->name) . '</strong> <span class="acw-muted">ID:' . $t2->term_id . '</span></span>';
                echo '<input type="text" class="regular-text" name="label_override[' . esc_attr($t2->term_id) . ']" value="' . esc_attr($curr_label) . '" placeholder="TÃªn hiá»ƒn thá»‹ (náº¿u muá»‘n)">';
                echo '<label class="acw-check"><input type="checkbox" name="exclude_level2[]" value="' . esc_attr($t2->term_id) . '" ' . $checked . '> áº¨n</label>';
                echo '<span></span></li>';
            } else {
                $lab = $row['label'] ?? '';
                $url = $row['url'] ?? '';
                echo '<li class="acw-mix-item custom" data-type="custom">';
                echo '<span class="dashicons dashicons-move acw-handle"></span>';
                echo '<input type="text" class="acw-mix-label" value="' . esc_attr($lab) . '" placeholder="TÃªn hiá»ƒn thá»‹">';
                echo '<input type="url" class="acw-mix-url" value="' . esc_attr($url) . '" placeholder="URL">';
                echo '<a href="#" class="acw-remove">XÃ³a</a></li>';
            }
        }
        echo '</ul><p><button type="button" class="button acw-add-custom-l2">+ ThÃªm má»¥c Cáº¥p 2</button></p></div>';

        echo '<div class="acw-col">';
        foreach ($level2_terms as $t2) {
            $pid = (int) $t2->term_id;
            $children = get_categories(array('taxonomy' => 'category', 'parent' => $pid, 'hide_empty' => false, 'orderby' => 'name', 'order' => 'ASC'));
            $by_id = array();
            foreach ($children as $c)
                $by_id[(int) $c->term_id] = $c;
            $mix3_view = array();
            if (!empty($cfg['level3_mix'][$pid])) {
                foreach ($cfg['level3_mix'][$pid] as $it) {
                    if ($it['type'] === 'term' && isset($by_id[(int) $it['id']])) {
                        $mix3_view[] = array('type' => 'term', 'term' => $by_id[(int) $it['id']]);
                        unset($by_id[(int) $it['id']]);
                    } elseif ($it['type'] === 'custom') {
                        $mix3_view[] = array('type' => 'custom', 'label' => $it['label'], 'url' => $it['url']);
                    }
                }
                foreach ($by_id as $t)
                    $mix3_view[] = array('type' => 'term', 'term' => $t);
            } else {
                foreach ($children as $t)
                    $mix3_view[] = array('type' => 'term', 'term' => $t);
                if (!empty($cfg['custom_level3'][$pid]))
                    foreach ($cfg['custom_level3'][$pid] as $it)
                        $mix3_view[] = array('type' => 'custom', 'label' => $it['label'], 'url' => $it['url']);
            }
            echo '<div class="acw-card"><h3>' . esc_html($t2->name) . ' <span class="acw-muted">ID: ' . $pid . '</span></h3>';
            echo '<ul id="acw-level3-mix-' . $pid . '" class="acw-level2-mix acw-level3-mix" data-parent="' . $pid . '">';
            foreach ($mix3_view as $row) {
                if ($row['type'] === 'term') {
                    $t3 = $row['term'];
                    $checked = in_array((int) $t3->term_id, $cfg['exclude_level3'], true) ? 'checked' : '';
                    $curr_label = $cfg['labels'][$t3->term_id] ?? '';
                    echo '<li class="acw-mix-item" data-type="term" data-termid="' . esc_attr($t3->term_id) . '">';
                    echo '<span class="dashicons dashicons-move acw-handle"></span>';
                    echo '<span class="acw-mix-title"><strong>' . esc_html($t3->name) . '</strong> <span class="acw-muted">ID:' . $t3->term_id . '</span></span>';
                    echo '<input type="text" class="regular-text" name="label_override[' . esc_attr($t3->term_id) . ']" value="' . esc_attr($curr_label) . '" placeholder="TÃªn hiá»ƒn thá»‹ (náº¿u muá»‘n)">';
                    echo '<label class="acw-check"><input type="checkbox" name="exclude_level3[]" value="' . esc_attr($t3->term_id) . '" ' . $checked . '> áº¨n</label>';
                    echo '<span></span></li>';
                } else {
                    $lab = $row['label'] ?? '';
                    $url = $row['url'] ?? '';
                    echo '<li class="acw-mix-item custom" data-type="custom">';
                    echo '<span class="dashicons dashicons-move acw-handle"></span>';
                    echo '<input type="text" class="acw-mix-label" value="' . esc_attr($lab) . '" placeholder="TÃªn hiá»ƒn thá»‹">';
                    echo '<input type="url" class="acw-mix-url" value="' . esc_attr($url) . '" placeholder="URL">';
                    echo '<a href="#" class="acw-remove">XÃ³a</a></li>';
                }
            }
            echo '</ul><p><button type="button" class="button acw-add-custom-l3" data-target="#acw-level3-mix-' . $pid . '">+ ThÃªm má»¥c Cáº¥p 3</button></p></div>';
        }
        echo '</div></div>';
        submit_button('LÆ°u cáº¥u hÃ¬nh', 'primary', 'acw_save');
        echo '</form></div>';
    }
    echo '</div>';
}

function acw_rest_term_payload($term, $config, &$visited)
{
    global $acw_rest_language;
    if ($acw_rest_language && function_exists('pll_get_term_language')) {
        $term_language = pll_get_term_language((int) $term->term_id);
        if ($term_language && $term_language !== $acw_rest_language) {
            return null;
        }
    }
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
        return new WP_Error('acw_category_not_found', 'KhÃ´ng tÃ¬m tháº¥y danh má»¥c cho sidebar.', array('status' => 404));
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
    global $acw_rest_language;
    $acw_rest_language = sanitize_key((string) $request->get_param('lang'));
    $category = acw_rest_resolve_category($request);
    if (is_wp_error($category)) {
        return $category;
    }

    $ancestors = get_ancestors((int) $category->term_id, 'category');
    $root = !empty($ancestors) ? get_category((int) end($ancestors)) : $category;
    if (!$root || is_wp_error($root)) {
        return new WP_Error('acw_root_not_found', 'KhÃ´ng tÃ¬m tháº¥y danh má»¥c gá»‘c.', array('status' => 404));
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
