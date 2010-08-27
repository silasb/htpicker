var last_folder_entry_action = null;
var show_animations = null;
var current_dir = null;

var focus_name = null;
var new_index_matching_focus_name = null;

var focus_index = 0;
var num_items = 0;

var icon_urls = {
    'directory': 'htpicker://file_resource?filepath=images/nuvola/gnome-fs-directory-visiting.svg&mime_type=image/svg+xml',
    'video': 'htpicker://file_resource?filepath=images/nuvola/mplayer.svg&mime_type=image/svg+xml',
    'game': 'htpicker://file_resource?filepath=images/nuvola/gamepad.svg&mime_type=image/svg+xml'
};

var menu_showing = false;
var fullscreen = null;

var icons = {};

var preload_images = function()
{
    for(var key in icon_urls)
    {
        var img = document.createElement('img');
        img.src = icon_urls[key];
        icons[key] = img;
    }
}

var activate = function(fullpath, type, display_name)
{
    if(type == 'directory')
    {
        if(display_name == '&#8593; Parent Folder')
            last_folder_entry_action = 'ascend';
        else
            last_folder_entry_action = 'descend';

        if(show_animations)
        {
            $('#files').hide("slide", {
                'direction': last_folder_entry_action == 'descend' ? 'left' : 'right',
                'mode': 'hide'
            }, 150);
        }

        load_files(fullpath);
    }
    else
    {
        $('#files').hide();
        $.get('htpicker://play_file?fullpath=' + fullpath);
        setTimeout(function() { $('#files').show(); }, 5000);
    }
}

var go_parent_directory = function()
{
    $('#files a').first().click();
}

var move_selection_up = function()
{
    if(focus_index > 0)
    {
        focus_index--;
        focus_current_index();
    }
}

var move_selection_down = function()
{
    if(focus_index < num_items-1)
    {
        focus_index++;
        focus_current_index();
    }
}

var focus_current_index = function()
{
    var el = $('#file-'+focus_index);
    el.focus();
    focus_name = el.attr('data-fullpath');
}

var activate_current_selection = function()
{
    $('#file-'+focus_index).click();
}

var scrollCentered = function(el, percentage, sweep_pct)
{
    var win = $(window);
    var sweep_area = win.height() * sweep_pct;

    // *0.5 because half of the buffer goes above
    // and the other half implicitly goes below
    var modifier = -(percentage * sweep_area - sweep_area/2);

    var offset = el.offset().top - win.height()/2 + el.outerHeight()/2 + modifier;
    win.scrollTop(offset);
}

var scroll_to_focus = function()
{
    var el = $('#file-'+focus_index);
    var percentage = 1.0 * focus_index / num_items;
    scrollCentered(el, percentage, 0.5);
}

var load_files = function(path) {
    if(path)
        current_dir = path;
    else
        last_folder_entry_action = 'load';

    $.getJSON('htpicker://list_files?directory=' + encodeURIComponent(current_dir), function(data) {
        var files = data['files'];
        $('#files').html('');
        new_index_matching_focus_name = null;
        num_items = files.length;
        for(var i = 0; i < num_items; i++)
        {
            var focusin_cb = function(i, num_items) {
                return function(ev) {
                    focus_index = i;
                    $('#files').show();
                    $('#file-'+focus_index).addClass("ui-state-active");
                    scroll_to_focus();
                };
            }(i, num_items);

            var focusout_cb = function(i) {
                return function(ev) {
                    $('#file-'+i).removeClass("ui-state-active");
                };
            }(i);

            var icon_name = files[i]['icon'];
            var icon_url = icon_name ? icons[icon_name].src : '';

            var item = (
                $('<a>')
                    .attr('id', 'file-'+i)
                    .attr('class', 'ui-widget-header item')
                    .focusin(focusin_cb)
                    .focusout(focusout_cb)
                    .attr('href', '#')
                    .attr('data-fullpath', files[i]['fullpath'])
                    .click(function(file) {
                        return function(ev) {
                            activate(file['fullpath'], file['type'], file['display_name']);
                        };
                    }(files[i]))
                    .html('<img src="' + icon_url + '"> <span>' + files[i]['display_name'] + '</span>')
            );

            if(files[i]['fullpath'] == focus_name)
                new_index_matching_focus_name = i;

            $('#files').append(item);
        }

        if(show_animations && (last_folder_entry_action == 'ascend' || last_folder_entry_action == 'descend'))
        {
            // ascend/descend
            focus_index = 0;
            $('#files').show("slide", {
                'direction': last_folder_entry_action == 'descend' ? 'right' : 'left',
                'mode': 'show'
            }, 250, function() { $('#files > a')[0].focus(); });
        }
        else
        {
            if(path)
            {
                // initial load
                focus_index = 0;
                focus_current_index();
            }
            else
            {
                // refresh
                if(new_index_matching_focus_name != null)
                    focus_index = new_index_matching_focus_name;
                focus_current_index();
                scroll_to_focus();
            }
        }
    });
}

$(function() {
    preload_images();

    $.ajax({
        'url': 'htpicker://show_animations',
        'dataType': 'json',
        'async': false,
        'success': function(data) { show_animations = data['show_animations']; }
    });
    $.ajax({
        'url': 'htpicker://fullscreen',
        'dataType': 'json',
        'async': false,
        'success': function(data) { fullscreen = data['fullscreen']; }
    });

    $.getJSON('htpicker://get_initial_dir', function(data) {
        var initial_dir = data['initial_dir'];
        load_files(initial_dir);
    });

    $('#fullscreen-toggle').click(function(ev) {
        if(fullscreen)
        {
            $.getJSON('htpicker://disable_fullscreen');
            $('#fullscreen-checkbox').html('');
        }
        else
        {
            $.getJSON('htpicker://enable_fullscreen');
            $('#fullscreen-checkbox').html('&#x2714;');
        }
        fullscreen = !fullscreen;
    });
    $('#exit').attr('href', 'htpicker://exit');

    $(document).keydown(function(ev) {
        if(ev.which == $.ui.keyCode.DOWN)
        {
            move_selection_down();
            return false;
        }
        if(ev.which == $.ui.keyCode.UP)
        {
            move_selection_up();
            return false;
        }
        if(ev.which == $.ui.keyCode.RIGHT)
        {
            if(!menu_showing)
                $('#menu').show("slide", { direction: "right" }, 400);
            menu_showing = true;
            return false;
        }
        if(ev.which == $.ui.keyCode.LEFT)
        {
            if(menu_showing)
                $('#menu').hide("slide", { direction: "right" }, 400);
            menu_showing = false;
            return false;
        }
    });
});
