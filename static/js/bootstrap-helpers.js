// https://github.com/JoshData/html5-stub/blob/master/static/js/bootstrap-helpers.js

var global_modal_state = null;
var global_modal_funcs = null;

$(function() {
  $('#global_modal').on('shown.bs.modal', function (e) {
    // set focus to first input in the global modal's body
    var input = $('#global_modal .modal-body input, #global_modal .modal-body textarea');
    if (input.length > 0) $(input[0]).focus();  
  })  
  $('#global_modal_primary').click(function() {
    // Don't take action now. Wait for the modal to be totally hidden
    // so that we don't attempt to show another modal while this one
    // is closing.
    global_modal_state = 0; // OK
  })
  $('#global_modal .btn-default').click(function() {
    global_modal_state = 1; // Cancel
  })
  $('#global_modal').on('hidden.bs.modal', function (e) {
    // do the cancel function
    if (global_modal_state == null) global_modal_state = 1; // cancel if the user hit ESC or clicked outside of the modal
    if (global_modal_funcs && global_modal_funcs[global_modal_state])
      global_modal_funcs[global_modal_state]();
  })

  // Before a tab is shown, ensure that the tab-content div won't
  // shrink in size, which when you're scrolled down can cause a
  // jarring up-scroll, by setting a min height to the tab-content's
  // current height.
  $('a[data-toggle="tab"]').on('show.bs.tab', function (e) {
    $('.tab-content').each(function() {
      $(this).css({ minHeight: $('.tab-content').innerHeight() });
    })
  })
})

function show_modal_error(title, message, callback) {
  $('#global_modal h4').text(title);
  $('#global_modal .modal-body').html("<p/>");
  if (typeof question == 'string') {
    $('#global_modal p').text(message);
    $('#global_modal .modal-dialog').addClass("modal-sm");
  } else {
    $('#global_modal p').html("").append(message);
    $('#global_modal .modal-dialog').removeClass("modal-sm");
  }
  $('#global_modal .btn-default').show().text("OK");
  $('#global_modal_primary').hide();
  global_modal_funcs = [callback, callback];
  global_modal_state = null;
  $('#global_modal').modal({});
  return false; // handy when called from onclick
}

function show_modal_confirm(title, question, verb, yes_callback, cancel_callback) {
  $('#global_modal h4').text(title);
  if (typeof question == 'string') {
    $('#global_modal .modal-dialog').addClass("modal-sm");
    $('#global_modal .modal-body').html("<p/>");
    $('#global_modal p').text(question);
  } else {
    $('#global_modal .modal-dialog').removeClass("modal-sm");
    $('#global_modal .modal-body').html("").append(question);
  }
  if (typeof verb == 'string') {
    $('#global_modal .btn-default').show().text("Cancel");
    $('#global_modal_primary').show()
      .attr("class", "btn btn-danger")
      .text(verb);
  } else {
    $('#global_modal .btn-default').show().text(verb[1]);
    $('#global_modal_primary').show()
      .attr("class", "btn " + (verb[2] || "btn-danger"))
      .text(verb[0]);
  }
  global_modal_funcs = [yes_callback, cancel_callback];
  global_modal_state = null;
  $('#global_modal').modal({});
  return false; // handy when called from onclick
}

var ajax_num_executing_requests = 0;
function ajax_with_indicator(options) {
  // If options.data is an instance of FormData, then
  // set some jQuery.ajax settings for it to work.
  // FormData allows the caller to upload files.
  if (options.data instanceof FormData) {
    // GET makes no sense
    options.type = "POST";

    // pass the FormData instance directly to XHR.send()
    // without converting to a string (which throws an
    // exception anyway)
    options.processData = false;

    // Prevent jQuery from setting the header. It will be set by XMLHttpRequest
    // instead. xhr.send() will ask the FormData for the content type, which
    // can't be predicted because of the MIME boundary.
    options.contentType = false;

    // Add an upload progress handler.
    options.xhr = function() {
      var xhr = $.ajaxSettings.xhr();
      xhr.upload.onprogress = function(e) {
        if (e.lengthComputable)
          $('#ajax_loading_indicator div.message').text("Loading... "
            + Math.round(e.loaded / e.total * 100) + '%');
      };
      return xhr;
    }
  }

  // Show the loading indicator after a short wait if the AJAX operation
  // is still in progress.
  setTimeout(function() {
    if (ajax_num_executing_requests == 0)
      return;
    $('#ajax_loading_indicator div.message').text("Loading..."); //reset
    $('#ajax_loading_indicator').fadeIn()
  }, 100);
  function hide_loading_indicator(success) {
    // Decrement counter of number of parallel pending ajax requests.
    ajax_num_executing_requests--;

    // Is this the last one to finish? If not, return.
    if (ajax_num_executing_requests != 0) return;

    // If this was on success and keep_indicator_forever is true, then
    // we don't clear the loading indicator. This is useful when the
    // success function always initiates a page reload, to prevent the
    // flickr of the loading indicator clearing and then the page reloading.
    if (success && options.keep_indicator_forever)
      return;
    
    // stop() prevents an ongoing fade from causing the thing to be shown
    // again after this call.
    $('#ajax_loading_indicator').stop(true).hide();
  }

  // Make a function that disables/re-enables specified controls.
  function disable_enable_controls(state) {
    if (!options.controls) return;
    options.controls.prop('disabled', state);
  }

  // Replace success and error functions.

  var old_success = options.success;
  var old_error = options.error;

  options.success = function(data) {
    var is_error = (data.status == "error");

    hide_loading_indicator(!is_error);
    disable_enable_controls(false);

    if (options.complete)
      options.complete();
    if (is_error)
      show_modal_error("Error", data.message);
    else if (old_success)
      old_success(data);
  };

  options.error = function(jqxhr) {
    hide_loading_indicator(false);
    disable_enable_controls(false);

    if (options.complete)
      options.complete();

    if (!old_error && jqxhr.status == 500 && /^text\/html/.test(jqxhr.getResponseHeader("content-type")) && /^(<!DOCTYPE[\w\W]*>)?\s*<html/.test(jqxhr.responseText)) {
      // We might get back HTML in a 500 error. Flask does this. Show the
      // HTML, in an iframe.
      show_modal_error("Error", '<iframe style="width: 100%; height: 60vh;"></iframe>')
      var ifrm = $('#global_modal').find('iframe')[0];
      ifrm = (ifrm.contentWindow) ? ifrm.contentWindow : (ifrm.contentDocument.document) ? ifrm.contentDocument.document : ifrm.contentDocument;
      ifrm.document.open();
      ifrm.document.write(jqxhr.responseText);
      ifrm.document.close();
    } else if (!old_error) {
      show_modal_error("Error", "Something went wrong, sorry.")
    } else {
      old_error(jqxhr.responseText, jqxhr);
    }
  };

  ajax_num_executing_requests++;
  disable_enable_controls(true);

  $.ajax(options);

  return false; // handy when called from onclick
}

function smooth_scroll_to(elem) {
  $('html, body').animate({
      scrollTop: Math.max(elem.offset().top-50, 0)
  });
}

function parse_qs(qs) {
  // Parse something that looks like a query string. The reverse
  // of $('form').serialize().
  // Based on http://stackoverflow.com/a/2880929/125992
  var match,
    pl     = /\+/g,  // Regex for replacing addition symbol with a space
    search = /([^&=]+)=?([^&]*)/g,
    decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
    ret = {};
  while (match = search.exec(qs))
    ret[decode(match[1])] = decode(match[2]);
  return ret;
}
