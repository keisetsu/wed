from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
import selenium.webdriver.support.expected_conditions as EC
from nose.tools import assert_true, assert_equal  # pylint: disable=E0611

import wedutil

# Don't complain about redefined functions
# pylint: disable=E0102


def no_before_unload(context):
    context.driver.execute_script("window.onbeforeunload = undefined;")


def load_and_wait_for_editor(context, text=None):
    no_before_unload(context)
    driver = context.driver
    util = context.util
    config = context.selenic_config
    server = config.WED_SERVER + "?mode=test"
    if text is not None:
        server = server + "&file=" + text

    driver.get(server)

    wedutil.wait_for_editor(util)

    # This is bullshit to work around a Selenium limitation.
    driver.execute_script("""
    jQuery("body").append(
      '<div id="origin-object" '+
      'style="position: fixed; top: 0px; left: 0px; z-index: -10;"/>');
    """)
    context.origin_object = driver.find_element_by_id("origin-object")


@when("the user loads the page")
def user_load(context):
    load_and_wait_for_editor(context)


@then("the editor shows a document")
def doc_appears(context):
    driver = context.driver
    WebDriverWait(driver, 2).until(
        EC.presence_of_element_located((By.CLASS_NAME, "_placeholder")))


@given("an open document")
def open_doc(context):
    load_and_wait_for_editor(context)


@given("a document containing a top level element, a p element, and text.")
def open_simple_doc(context):
    load_and_wait_for_editor(
        context,
        text="/build/test-files/wed_test_data/source_converted.xml")


@when('the user clicks on text that does not contain "{text}"')
def step_impl(context, text):
    driver = context.driver
    util = context.util

    element = util.find_clickable_element((By.CLASS_NAME, "title"))
    element.click()
    wedutil.wait_for_caret_to_be_in(util, element)
    context.element_to_test_for_text = element
    assert_true(
        util.get_text_excluding_children(element).find(text) == -1)


@when('the user clicks on the start label of an element that does not '
      'contain "{text}"')
def step_impl(context, text):
    driver = context.driver
    util = context.util

    button = util.find_element((By.CSS_SELECTOR,
                                "._start_button._title_label"))
    button.click()
    parent = button.find_element_by_xpath("..")
    assert_true(util.get_text_excluding_children(parent).find(text) == -1)
    context.element_to_test_for_text = parent


@when('the user resizes the window so that the editor pane has a vertical '
      'scrollbar')
def step_impl(context):
    util = context.util
    wedutil.set_window_size(util, 683, 741)


@when('the user resizes the window so that the editor pane will be offscreen')
def step_impl(context):
    util = context.util
    wedutil.set_window_size(util, 683, 500)


@when("the user scrolls the window down so that the editor's top is at the "
      "top of the window")
def step_impl(context):
    driver = context.driver
    util = context.util

    # We must not call it before the body is fully loaded.
    driver.execute_script("""
    delete window.__selenic_scrolled;
    jQuery(function () {
      window.scrollTo(0, wed_editor.$gui_root.offset().top);
      window.__selenic_scrolled = true;
    });
    """)

    def cond(*_):
        return driver.execute_script("""
        return window.__selenic_scrolled
        """)
    util.wait(cond)

    context.window_scroll_top = util.window_scroll_top()
    context.window_scroll_left = util.window_scroll_left()


@when("the user scrolls the window completely down")
def step_impl(context):
    driver = context.driver
    util = context.util

    # We must not call it before the body is fully loaded.
    driver.execute_script("""
    delete window.__selenic_scrolled;
    jQuery(function () {
      window.scrollTo(0, document.body.scrollHeight);
      window.__selenic_scrolled = true;
    });
    """)

    def cond(*_):
        return driver.execute_script("""
        return window.__selenic_scrolled;
        """)
    util.wait(cond)

    context.window_scroll_top = util.window_scroll_top()
    context.window_scroll_left = util.window_scroll_left()


@when("the user scrolls the editor pane down")
def step_impl(context):
    driver = context.driver
    util = context.util

    scroll_by = 10

    # We must not call it before the body is fully loaded.
    driver.execute_script("""
    var by = arguments[0];
    delete window.__selenic_scrolled;
    jQuery(function () {
      var top = window.wed_editor.$gui_root.scrollTop();
      window.wed_editor.$gui_root.scrollTop(top + by);
      window.__selenic_scrolled = true;
    });
    """, scroll_by)

    def cond(*_):
        return driver.execute_script("""
        return window.__selenic_scrolled;
        """)
    util.wait(cond)
    context.scrolled_editor_pane_by = scroll_by


@when(u"wait {x} seconds")
def step_impl(context, x):
    import time
    time.sleep(float(x))


step_matcher("re")


@then(ur"^the window's contents does not move.?$")
def step_impl(context):
    util = context.util

    assert_equal(util.window_scroll_top(), context.window_scroll_top,
                 "top must not have changed")
    assert_equal(util.window_scroll_left(), context.window_scroll_left,
                 "left must not have changed")


@then("the editor pane has focus")
def step_impl(context):
    driver = context.driver
    util = context.util

    def cond(*_):
        return driver.execute_script("""
        return window.document.activeElement === wed_editor._$input_field[0];
        """)
    util.wait(cond)
