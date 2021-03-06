/**
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright 2013 Mangalam Research Center for Buddhist Languages
 */
define(["mocha/mocha", "chai", "browser_test/global", "jquery", "wed/wed",
        "wed/domutil", "rangy", "wed/key_constants", "wed/onerror", "wed/log",
        "wed/key"],
       function (mocha, chai, global, $, wed, domutil, rangy, key_constants,
                onerror, log, key) {
'use strict';

var options = {
    schema: 'browser_test/tei-simplified-rng.js',
    mode: {
        path: 'test',
        options: {
            meta: 'wed/modes/generic/metas/tei_meta'
        }
    }
};
var assert = chai.assert;

var wedroot = $("#wedframe-invisible").contents().find("#wedroot").get(0);
var $wedroot = $(wedroot);
var src_stack = ["../../test-files/wed_test_data/source_converted.xml"];

function caretCheck(editor, container, offset, msg) {
    assert.equal(editor._raw_caret[0], container, msg + " (container)");
    assert.equal(editor._raw_caret[1], offset, msg + " (offset)");
}

function dataCaretCheck(editor, container, offset, msg) {
    var data_caret = editor.getDataCaret();
    assert.equal(data_caret[0], container, msg + " (container)");
    assert.equal(data_caret[1], offset, msg + " (offset)");
}


function firstGUI($container) {
    return $container.children("._gui").get(0);
}

function lastGUI($container) {
    return $container.children("._gui").last().get(0);
}

function firstPH($container) {
    return $container.children("._placeholder").get(0).childNodes[0];
}

function lastPH($container) {
    return $container.children("._placeholder").last().
        get(0).childNodes[0];
}

describe("wed", function () {
    var editor;
    beforeEach(function (done) {
        $wedroot.empty();
        require(["requirejs/text!" + src_stack[0]], function(data) {
            $wedroot.append(data);
            editor = new wed.Editor();
            editor.addEventListener("initialized", function () {
                done();
            });
            editor.init(wedroot, options);
        });
    });

    afterEach(function () {
        if (editor)
            editor.destroy();
        editor = undefined;
        assert.isFalse(onerror.__test.is_terminating(),
                       "test caused an unhandled exception to occur");
        // We don't reload our page so we need to do this.
        onerror.__test.reset();
    });

    it("starts with an undefined caret", function () {
        assert.equal(editor.getCaret(), undefined, "no caret");
    });

    it("clicking moves the caret", function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            // Text node inside title.
            var initial = $(editor.gui_root).find(".title").
                get(0).childNodes[1];
            editor.setCaret(initial, initial.nodeValue.length);
            editor.moveCaretRight();
            // It is now inside the final gui element.
            caretCheck(editor, lastGUI($(initial.parentNode)),
                       0, "initial caret position");

            // We have to set the selection manually and
            // generate a click event because just generating
            // the event won't move the caret.
            var r = rangy.createRange();
            r.setStart(initial, 0);
            var scroll_top = editor.my_window.document.body.scrollTop;
            var scroll_left = editor.my_window.document.body.scrollLeft;
            rangy.getSelection(editor.my_window).setSingleRange(r);
            // We have to take the offset of the parent because
            // initial is a text node.
            var initial_offset = $(initial.parentNode).offset();
            var init = {
                target: initial,
                clientX: initial_offset.left - scroll_left,
                clientY: initial_offset.top - scroll_top,
                pageX: initial_offset.left,
                pageY: initial_offset.top
            };
            var ev = $.Event("mousedown", init);
            $(initial.parentNode).trigger(ev);
            ev = $.Event("mouseup", init);
            $(initial.parentNode).trigger(ev);

            // We need to do this because setting the caret
            // through a click is not instantaneous. wed
            // internally sets a timeout of 0 length to deal with
            // browser incompatibilities. We need to do the same
            // so that wed's timeout runs before we query the
            // value.
            editor.my_window.setTimeout(function () {
                caretCheck(editor, initial, 0, "final caret position");

                done();
            }, 1);
        });
    });

    it("typing text works", function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            // Text node inside title.
            var initial = $(editor.gui_root).find(".title").
                get(0).childNodes[1];
            var parent = initial.parentNode;
            editor.setCaret(initial, 0);

            // There was a version of wed which would fail this
            // test. The fake caret would be inserted inside the
            // text node, which would throw off the
            // nodeToPath/pathToNode calculations.

            editor.type(" ");
            assert.equal(initial.nodeValue, " abcd");
            assert.equal(parent.childNodes.length, 3);

            editor.type(" ");
            assert.equal(initial.nodeValue, "  abcd");
            assert.equal(parent.childNodes.length, 3);

            // This is where wed used to fail.
            editor.type(" ");
            assert.equal(initial.nodeValue, "   abcd");
            assert.equal(parent.childNodes.length, 3);
            done();
        });
    });

    it("typing text when the caret is adjacent to text works (before text)",
       function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            // Text node inside title.
            var $p = $(editor.data_root).find(".body>.p").eq(3);
            var $hi = $p.children(".hi").last();
            var initial = $p[0];

            // We put the caret just after the last <hi>, which means
            // it is just before the last text node.
            editor.setDataCaret(
                initial,
                Array.prototype.indexOf.call(initial.childNodes, $hi[0]) + 1);

            var initial_length = initial.childNodes.length;

            editor.type(" ");
            assert.equal(initial.lastChild.nodeValue, " c");
            assert.equal(initial.childNodes.length, initial_length);
            done();
        });
    });

    it("typing text when the caret is adjacent to text works (after text)",
       function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            // Text node inside title.
            var $p = $(editor.data_root).find(".body>.p").eq(3);
            var initial = $p[0];

            // We put the caret just after the last child, a text node.
            editor.setDataCaret(initial, initial.childNodes.length);

            var initial_length = initial.childNodes.length;

            editor.type(" ");
            assert.equal(initial.lastChild.nodeValue, "c ");
            assert.equal(initial.childNodes.length, initial_length);
            done();
        });
    });

    it("typing longer than the length of a text undo works", function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            // Text node inside title.
            var initial = $(editor.gui_root).find(".title").
                get(0).childNodes[1];
            var parent = initial.parentNode;
            editor.setCaret(initial, 0);

            var text =  new Array(editor._text_undo_max_length + 1).join("a");
            editor.type(text);
            assert.equal(initial.nodeValue, text + "abcd");
            assert.equal(parent.childNodes.length, 3);
            done();
        });
    });

    it("typing text after an element works", function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            var initial = $(editor.data_root).find(".body>.p").get(1);
            var parent = initial.parentNode;
            editor.setDataCaret(initial, 1);

            editor.type(" ");
            assert.equal(initial.childNodes.length, 2);
            done();
        });
    });

    it("typing text in phantom text does nothing", function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            var ref = $(editor.$gui_root.find(".body>.p")[2]
                                              ).children(".ref")[0];
            var initial = ref.childNodes[0];

            // Make sure we're looking at the right thing.
            assert.isTrue($(initial).is("._phantom"), " initial is phantom");
            assert.equal($(initial).text(), "(", "initial's value");
            editor.setCaret(initial, 1);

            editor.type(" ");
            assert.equal($(initial).text(), "(", "initial's value after");
            done();
        });
    });


    it("typing text moves the caret", function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            // Text node inside title.
            var initial = $(editor.gui_root).find(".title").
                get(0).childNodes[1];
            var parent = initial.parentNode;
            editor.setCaret(initial, 0);

            // There was a version of wed which would fail this
            // test. The fake caret would be inserted inside the
            // text node, which would throw off the
            // nodeToPath/pathToNode calculations.

            editor.type("blah");
            assert.equal(initial.nodeValue, "blahabcd");
            assert.equal(parent.childNodes.length, 3);
            caretCheck(editor, initial, 4, "caret after text insertion");
            done();
        });
    });

    it("undo undoes typed text as a group", function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            // Text node inside title.
            var initial = $(editor.gui_root).find(".title").
                get(0).childNodes[1];
            var parent = initial.parentNode;
            editor.setCaret(initial, 0);

            // There was a version of wed which would fail this
            // test. The fake caret would be inserted inside the
            // text node, which would throw off the
            // nodeToPath/pathToNode calculations.

            editor.type("blah");
            assert.equal(initial.nodeValue, "blahabcd", "text after edit");
            assert.equal(parent.childNodes.length, 3);

            editor.undo();
            assert.equal(initial.nodeValue, "abcd", "text after undo");
            assert.equal(parent.childNodes.length, 3);
            caretCheck(editor, initial, 0, "caret after undo");
            done();
        });
    });

    it("redo redoes typed text as a group", function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            // Text node inside title.
            var initial = $(editor.gui_root).find(".title").
                get(0).childNodes[1];
            var parent = initial.parentNode;
            editor.setCaret(initial, 0);

            // There was a version of wed which would fail this
            // test. The fake caret would be inserted inside the
            // text node, which would throw off the
            // nodeToPath/pathToNode calculations.

            editor.type("blah");
            assert.equal(initial.nodeValue, "blahabcd", "text after edit");
            assert.equal(parent.childNodes.length, 3);

            editor.undo();
            assert.equal(initial.nodeValue, "abcd", "text after undo");
            assert.equal(parent.childNodes.length, 3);
            caretCheck(editor, initial, 0, "caret after undo");

            editor.redo();
            assert.equal(initial.nodeValue, "blahabcd", "text after undo");
            assert.equal(parent.childNodes.length, 3);
            caretCheck(editor, initial, 4, "caret after redo");
            done();
        });
    });

    it("clicking a gui element after typing text works", function (done) {
        editor.whenCondition(
            "initialized",
            function () {
            // Text node inside paragraph.
            var initial = $(editor.data_root).find(".body>.p").get(0);
            var parent = initial.parentNode;
            editor.setDataCaret(initial.childNodes[0], 1);

            editor.type(" ");
            assert.equal(initial.childNodes[0].nodeValue, "B lah blah ");

            var caret = editor.getCaret();
            var $last_gui = $(caret).closest(".p").children().last();
            assert.isTrue($last_gui.is("._gui"));
            var last_gui_span = $last_gui.children()[0];

            // We're simulating how Chrome would handle it. When a
            // mousedown event occurs, Chrome moves the caret *after*
            // the mousedown event is processed.
            var event = new $.Event("mousedown");
            event.target = last_gui_span;
            var range = rangy.createRange(editor.my_window.document);
            range.setStart(caret[0], caret[1]);
            editor.getDOMSelection().setSingleRange(range);

            // This simulates the movement of the caret after the
            // mousedown event is process. This will be processed
            // after the mousedown handler but before _seekCaret is
            // run.
            window.setTimeout(log.wrap(function () {
                var range = rangy.createRange(editor.my_window.document);
                range.setStart(last_gui_span);
                editor.getDOMSelection().setSingleRange(range);
            }), 0);

            // We trigger the event here so that the order specified
            // above is respected.
            $(last_gui_span).trigger(event);

            window.setTimeout(log.wrap(function () {
                event = new $.Event("click");
                event.target = last_gui_span;
                $(last_gui_span).trigger(event);
                done();
            }), 1);
        });
    });

    it("clicking a phantom element after typing text works", function (done) {
        editor.whenCondition(
            "initialized",
            function () {
            // We create a special phantom element because the generic
            // mode does not create any.
            var title = editor.$gui_root.find(".title").get(0);
            var phantom = $("<span class='_phantom'>phantom</span>").get(0);
            title.insertBefore(phantom, null);

            // Text node inside paragraph.
            var initial = $(editor.data_root).find(".body>.p").get(0);
            var parent = initial.parentNode;
            editor.setDataCaret(initial.childNodes[0], 1);

            editor.type(" ");
            assert.equal(initial.childNodes[0].nodeValue, "B lah blah ");

            var caret = editor.getCaret();

            // We're simulating how Chrome would handle it. When a
            // mousedown event occurs, Chrome moves the caret *after*
            // the mousedown event is processed.
            var event = new $.Event("mousedown");
            event.target = phantom;
            var range = rangy.createRange(editor.my_window.document);
            range.setStart(caret[0], caret[1]);
            editor.getDOMSelection().setSingleRange(range);

            // This simulates the movement of the caret after the
            // mousedown event is process. This will be processed
            // after the mousedown handler but before _seekCaret is
            // run.
            window.setTimeout(log.wrap(function () {
                var range = rangy.createRange(editor.my_window.document);
                range.setStart(phantom, 0);
                editor.getDOMSelection().setSingleRange(range);
            }), 0);

            // We trigger the event here so that the order specified
            // above is respected.
            $(phantom).trigger(event);

            window.setTimeout(log.wrap(function () {
                event = new $.Event("click");
                event.target = phantom;
                $(phantom).trigger(event);
                done();
            }), 1);
        });
    });


    it("an element that becomes empty acquires a placeholder", function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            // Text node inside title.
            var initial = $(editor.data_root).find(".title").get(0);
            var parent = initial.parentNode;

            // Make sure we are looking at the right thing.
            assert.equal(initial.childNodes.length, 1);
            assert.equal(initial.childNodes[0].nodeValue, "abcd");
            editor.setDataCaret(initial, 0);
            var caret = editor.getCaret();
            assert.equal(caret[0].childNodes[caret[1]].nodeValue, "abcd");

            // Delete all contents.
            editor.data_updater.removeNode(initial.childNodes[0]);

            // We should have a placeholder now, between the two labels.
            assert.equal(caret[0].childNodes.length, 3);
            assert.isTrue($(caret[0].childNodes[1]).is("._placeholder"));
            done();
        });
    });

    it("unwraps elements", function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            // Text node inside title.
            var initial = $(editor.data_root).find(".title").get(0);

            // Make sure we are looking at the right thing.
            assert.equal(initial.childNodes.length, 1);
            assert.equal(initial.childNodes[0].nodeValue, "abcd");
            editor.setDataCaret(initial, 0);
            var caret = editor.getCaret();
            assert.equal(caret[0].childNodes[caret[1]].nodeValue, "abcd");

            var trs = editor.mode.getContextualActions(
                ["wrap"], "hi", initial, 0);

            var tr = trs[0];
            var data = {node: undefined, element_name: "hi"};
            var range = rangy.createRange(editor.my_window.document);
            editor.setDataCaret(initial.childNodes[0], 1);
            caret = editor.getCaret();
            range.setStart(caret[0], caret[1]);
            range.setEnd(caret[0], caret[1] + 2);
            editor.setSelectionRange(range);

            tr.execute(data);

            trs = editor.mode.getContextualActions(
                ["unwrap"], "hi", $(initial).children(".hi")[0], 0);

            tr = trs[0];
            data = {node: $(initial).children(".hi")[0], element_name: "hi" };
            tr.execute(data);
            assert.equal(initial.childNodes.length, 1, "length after unwrap");
            assert.equal(initial.firstChild.nodeValue, "abcd");
            done();
        });
    });

    it("wraps elements in elements (offset 0)", function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            // Text node inside title.
            var initial = $(editor.data_root).find(".body>.p")[4];

            // Make sure we are looking at the right thing.
            assert.equal(initial.childNodes.length, 1);
            assert.equal(initial.firstChild.nodeValue, "abcdefghij");

            var trs = editor.mode.getContextualActions(
                ["wrap"], "hi", initial, 0);

            var tr = trs[0];
            var data = {node: undefined, element_name: "hi"};
            var range = rangy.createRange(editor.my_window.document);
            editor.setDataCaret(initial.firstChild, 3);
            var caret = editor.getCaret();
            range.setStart(caret[0], caret[1]);
            range.setEnd(caret[0], caret[1] + 2);
            editor.setSelectionRange(range);

            tr.execute(data);

            assert.equal(initial.innerHTML,
                         'abc<div class="hi _real">de</div>fghij');
            assert.equal(initial.childNodes.length, 3,
                         "length after first wrap");

            caret = editor.fromDataCaret(initial.firstChild, 0);
            range.setStart(caret[0], caret[1]);
            caret = editor.fromDataCaret(initial.lastChild, 0);
            range.setEnd(caret[0], caret[1]);
            editor.setSelectionRange(range);

            tr.execute(data);

            assert.equal(initial.innerHTML,
                         '<div class="hi _real">abc<div class="hi _real">' +
                         'de</div></div>fghij');
            assert.equal(initial.childNodes.length, 2,
                         "length after second wrap");

            done();
        });
    });

    it("wraps elements in elements (offset === nodeValue.length)",
       function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            // Text node inside title.
            var initial = $(editor.data_root).find(".body>.p")[4];

            // Make sure we are looking at the right thing.
            assert.equal(initial.childNodes.length, 1);
            assert.equal(initial.firstChild.nodeValue, "abcdefghij");

            var trs = editor.mode.getContextualActions(
                ["wrap"], "hi", initial, 0);

            var tr = trs[0];
            var data = {node: undefined, element_name: "hi"};
            var range = rangy.createRange(editor.my_window.document);
            var caret = editor.fromDataCaret(initial.firstChild, 3);
            range.setStart(caret[0], caret[1]);
            range.setEnd(caret[0], caret[1] + 2);
            editor.setSelectionRange(range);

            tr.execute(data);

            assert.equal(initial.innerHTML,
                         'abc<div class="hi _real">de</div>fghij');
            assert.equal(initial.childNodes.length, 3,
                         "length after first wrap");

            // We can't set this to the full length of the node value
            // on Chrome because Chrome will move the range into the
            // <div> that you see above in the innerHTML test. :-/
            caret = editor.fromDataCaret(initial.firstChild,
                                         initial.firstChild.nodeValue.length -
                                         1);
            range.setStart(caret[0], caret[1]);
            // This tests the condition we're interested in.
            caret = editor.fromDataCaret(initial.lastChild,
                                         initial.lastChild.nodeValue.length);
            range.setEnd(caret[0], caret[1]);
            editor.setSelectionRange(range);

            tr.execute(data);

            assert.equal(initial.innerHTML,
                         'ab<div class="hi _real">c<div class="hi _real">' +
                         'de</div>fghij</div>');
            assert.equal(initial.childNodes.length, 2,
                         "length after second wrap");

            done();
        });
    });

    it("wraps elements in elements (no limit case)", function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            // Text node inside title.
            var initial = $(editor.data_root).find(".body>.p")[4];

            // Make sure we are looking at the right thing.
            assert.equal(initial.childNodes.length, 1);
            assert.equal(initial.firstChild.nodeValue, "abcdefghij");

            var trs = editor.mode.getContextualActions(
                ["wrap"], "hi", initial, 0);

            var tr = trs[0];
            var data = {node: undefined, element_name: "hi"};
            var range = rangy.createRange(editor.my_window.document);
            var caret = editor.fromDataCaret(initial.firstChild, 3);
            range.setStart(caret[0], caret[1]);
            range.setEnd(caret[0], caret[1] + 2);
            editor.setSelectionRange(range);

            tr.execute(data);

            assert.equal(initial.childNodes.length, 3,
                         "length after first wrap");
            assert.equal(initial.innerHTML,
                         'abc<div class="hi _real">de</div>fghij');

            caret = editor.fromDataCaret(initial.firstChild, 2);
            range.setStart(caret[0], caret[1]);
            caret = editor.fromDataCaret(initial.lastChild, 2);
            range.setEnd(caret[0], caret[1]);
            editor.setSelectionRange(range);

            tr.execute(data);

            assert.equal(initial.childNodes.length, 3,
                         "length after second wrap");
            assert.equal(initial.innerHTML,
                         'ab<div class="hi _real">c<div class="hi _real">' +
                         'de</div>fg</div>hij');

            done();
        });
    });

    function activateContextMenu(editor) {
        var event = new $.Event("mousedown");
        var offset = editor.$gui_root.offset();
        event.which = 3;
        event.pageX = offset.left;
        event.pageY = offset.top;
        editor.$gui_root.trigger(event);
    }

    it("does not bring up a contextual menu when there is no caret",
       function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            var initial = $(editor.gui_root).find(".title").
                get(0).childNodes[1];
            assert.isUndefined(editor.getCaret());
            activateContextMenu(editor);
            window.setTimeout(function () {
                assert.isUndefined(editor._current_dropdown);
                done();
            }, 1);
        });
    });

    it("does not crash when the user tries to bring up a contextual menu "+
       "when the caret is outside wed",
       function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            // Set the range on the first hyperlink in the page.
            var range = rangy.createRange(editor.my_window.document);
            range.selectNode($("div", editor.my_window.document).get(0));
            rangy.getSelection(editor.my_window).setSingleRange(range);
            assert.isUndefined(editor.getCaret());
            activateContextMenu(editor);
            window.setTimeout(function () {
                assert.isUndefined(editor._current_dropdown);
                done();
            }, 1);
        });
    });

    it("brings up a contextual menu when there is a caret",
       function (done) {
        editor.whenCondition(
            "first-validation-complete",
            function () {
            var initial = $(editor.gui_root).find(".title").
                get(0).childNodes[1];
            editor.setCaret(initial, 0);

            activateContextMenu(editor);
            window.setTimeout(function () {
                assert.isDefined(editor._current_dropdown);
                done();
            }, 1);
        });
    });

    describe("moveCaretRight", function () {
        it("works even if there is no caret defined", function () {
            assert.equal(editor.getCaret(), undefined, "no caret");
            editor.moveCaretRight();
            assert.equal(editor.getCaret(), undefined, "no caret");
        });

        it("moves right into gui elements",
           function (done) {
            editor.whenCondition(
                "first-validation-complete",
                function () {
                var initial = editor.gui_root.childNodes[0];
                editor.setCaret(initial, 0);
                caretCheck(editor, initial, 0, "initial");
                editor.moveCaretRight();
                var first_gui = firstGUI($(initial));
                // It is now located inside the text inside
                // the label which marks the start of the TEI
                // element.
                caretCheck(editor, first_gui, 0, "moved once");
                editor.moveCaretRight();

                // It is now after the gui element..
                caretCheck(editor, first_gui.parentNode, 1, "moved thrice");

                editor.moveCaretRight();

                // It is now in the gui element of the 1st
                // child.
                caretCheck(editor,
                           firstGUI($(initial).find(".teiHeader").first()),
                           0, "moved thrice");
                done();
            });
        });

        it("moves right into text",
           function (done) {
            editor.whenCondition(
                "first-validation-complete",
                function () {
                var initial = $(editor.gui_root).find(".title").first().get(0);
                editor.setCaret(initial, 0);
                caretCheck(editor, initial, 0, "initial");
                editor.moveCaretRight();
                // It is now located inside the text inside
                // the label which marks the start of the TEI
                // element.
                caretCheck(editor, firstGUI($(initial)), 0, "moved once");
                editor.moveCaretRight();
                editor.moveCaretRight();
                // It is now inside the text
                var text_node = $(initial).children("._gui").
                    get(0).nextSibling;
                caretCheck(editor, text_node, 0, "moved 3 times");
                editor.moveCaretRight();
                // move through text
                caretCheck(editor, text_node, 1, "moved 4 times");
                editor.moveCaretRight();
                editor.moveCaretRight();
                editor.moveCaretRight();
                // move through text
                caretCheck(editor, text_node, 4, "moved 7 times");
                editor.moveCaretRight();
                // It is now inside the final gui element.
                caretCheck(editor, lastGUI($(initial)), 0, "moved 8 times");

                done();
            });
        });

        it("moves right from text to text", function (done) {
            editor.whenCondition(
                "first-validation-complete",
                function () {
                var term = $(editor.gui_root).find(".body>.p>.term").
                    first().get(0);
                var initial = term.previousSibling;
                // Make sure we are on the right element.
                assert.equal(initial.nodeType, Node.TEXT_NODE);
                assert.equal(initial.nodeValue, "Blah blah ");

                editor.setCaret(initial, initial.nodeValue.length - 1);
                caretCheck(editor, initial,
                           initial.nodeValue.length - 1, "initial");

                editor.moveCaretRight();
                caretCheck(editor, initial, initial.nodeValue.length,
                           "moved once");

                editor.moveCaretRight();
                caretCheck(editor, term.childNodes[0], 0, "moved twice");
                done();
            });
        });

        it("moves right out of elements",
           function (done) {
            editor.whenCondition(
                "first-validation-complete",
                function () {
                // Text node inside title.
                var initial = $(editor.gui_root).find(".title").
                    get(0).childNodes[1];
                editor.setCaret(initial, initial.nodeValue.length);
                caretCheck(editor, initial,
                           initial.nodeValue.length, "initial");
                editor.moveCaretRight();
                // It is now inside the final gui element.
                caretCheck(editor, lastGUI($(initial.parentNode)),
                           0, "moved once");
                editor.moveCaretRight();
                // It is now before the gui element at end of
                // the title's parent.
                var last_gui = lastGUI($(editor.gui_root).find(".title").
                                       parent());
                caretCheck(editor, last_gui.parentNode,
                           last_gui.parentNode.childNodes.length - 1,
                           "moved twice");

                done();

            });
        });

        it("does not move when at end of document",
           function (done) {
            editor.whenCondition(
                "first-validation-complete",
                function () {
                var initial = lastGUI($(editor.gui_root).children(".TEI"));
                editor.setCaret(initial, 0);
                caretCheck(editor, initial, 0, "initial");
                editor.moveCaretRight();
                // Same position
                caretCheck(editor, initial, 0, "moved once");
                done();
            });
        });
    });

    describe("moveCaretLeft", function () {
        it("works even if there is no caret defined", function () {
            assert.equal(editor.getCaret(), undefined, "no caret");
            editor.moveCaretLeft();
            assert.equal(editor.getCaret(), undefined, "no caret");
        });

        it("moves left into gui elements",
           function (done) {
            editor.whenCondition(
                "first-validation-complete",
                function () {
                var initial = editor.gui_root.childNodes[0];
                var offset = initial.childNodes.length;
                editor.setCaret(initial, offset);
                caretCheck(editor, initial, offset, "initial");
                editor.moveCaretLeft();
                var last_gui =  lastGUI($(initial));
                // It is now located inside the text inside
                // the label which marks the start of the TEI
                // element.
                caretCheck(editor, last_gui, 0, "moved once");
                editor.moveCaretLeft();
                caretCheck(editor, last_gui.parentNode,
                           last_gui.parentNode.childNodes.length - 1,
                           "moved twice");

                editor.moveCaretLeft();
                // It is now in the gui element of the 1st
                // child.
                var $last_text = $(initial).find(".text").last();
                caretCheck(editor, lastGUI($last_text),
                           0, "moved 3 times");

                done();
            });
        });

        it("moves left into text",
           function (done) {
            editor.whenCondition(
                "first-validation-complete",
                function () {
                var initial = lastGUI($(editor.gui_root).find(".title").
                                      first());
                editor.setCaret(initial, 1);
                caretCheck(editor, initial, 1, "initial");
                editor.moveCaretLeft();
                editor.moveCaretLeft();
                // It is now inside the text
                var text_node = initial.previousSibling;
                var offset = text_node.nodeValue.length;
                caretCheck(editor, text_node, offset, "moved once");
                editor.moveCaretLeft();
                // move through text
                offset--;
                caretCheck(editor, text_node, offset, "moved twice");
                editor.moveCaretLeft();
                editor.moveCaretLeft();
                editor.moveCaretLeft();
                caretCheck(editor, text_node, 0, "moved 5 times");
                editor.moveCaretLeft();
                // It is now inside the first gui element.
                caretCheck(editor, firstGUI($(editor.gui_root).
                                            find(".title").first()),
                           0, "moved 6 times");

                done();
            });
        });

        it("moves left out of elements",
           function (done) {
            editor.whenCondition(
                "first-validation-complete",
                function () {
                var initial =
                    firstGUI($(editor.gui_root).find(".title"));
                editor.setCaret(initial, 0);
                caretCheck(editor, initial, 0, "initial");
                editor.moveCaretLeft();
                // It is now after the gui element at start of
                // the title's parent.
                var first_gui =
                    firstGUI($(editor.gui_root).find(".title").parent());

                caretCheck(editor, first_gui.parentNode, 1, "moved once");

                done();

            });
        });

        it("moves left from text to text", function (done) {
            editor.whenCondition(
                "first-validation-complete",
                function () {
                var term = $(editor.gui_root).find(".body>.p>.term").
                    first().get(0);
                var initial = term.nextSibling;
                // Make sure we are on the right element.
                assert.equal(initial.nodeType, Node.TEXT_NODE);
                assert.equal(initial.nodeValue, " blah.");

                editor.setCaret(initial, 1);
                caretCheck(editor, initial, 1, "initial");

                editor.moveCaretLeft();
                caretCheck(editor, initial, 0, "moved once");

                editor.moveCaretLeft();
                caretCheck(editor, term.childNodes[0],
                           term.childNodes[0].nodeValue.length,
                           "moved twice");

                done();
            });
        });

        it("does not move when at start of document",
           function (done) {
            editor.whenCondition(
                "first-validation-complete",
                function () {
                var initial = firstGUI($(editor.gui_root).children(".TEI"));
                editor.setCaret(initial, 0);
                caretCheck(editor, initial, 0, "initial");
                editor.moveCaretLeft();
                // Same position
                caretCheck(editor, initial, 0, "moved once");
                done();
            });
        });

    });

    it("handles pasting simple text", function () {
        var initial = editor.$data_root.find(".body>.p").get(0).childNodes[0];
        editor.setDataCaret(initial, 0);
        var initial_value = initial.nodeValue;

        // Synthetic event
        var event = new $.Event("paste");
        // Provide a skeleton of clipboard data
        event.originalEvent = {
            clipboardData: {
                types: ["text/plain"],
                getData: function (type) {
                    return "abcdef";
                }
            }
        };
        editor.$gui_root.trigger(event);
        assert.equal(initial.nodeValue, "abcdef" + initial_value);
        var final_caret = editor.getDataCaret();
        dataCaretCheck(editor, initial, 6, "final position");
    });

    it("handles pasting structured text", function () {
        var $p = editor.$data_root.find(".body>.p").first();
        var initial = $p.get(0).childNodes[0];
        editor.setDataCaret(initial, 0);
        var initial_value = $p.get(0).innerHTML;

        // Synthetic event
        var event = new $.Event("paste");
        // Provide a skeleton of clipboard data
        event.originalEvent = {
            clipboardData: {
                types: ["text/html", "text/plain"],
                getData: function (type) {
                    return $p.get(0).innerHTML;
                }
            }
        };
        editor.$gui_root.trigger(event);
        assert.equal($p.get(0).innerHTML, initial_value + initial_value);
        dataCaretCheck(editor, $p.get(0).childNodes[2], 6,
                       "final position");
    });

    it("handles pasting structured text: invalid, decline pasting as text",
       function (done) {
        var $p = editor.$data_root.find(".body>.p").first();
        var initial = $p.get(0).childNodes[0];
        editor.setDataCaret(initial, 0);
        var initial_value = $p.get(0).innerHTML;

        // Synthetic event
        var event = new $.Event("paste");
        // Provide a skeleton of clipboard data
        event.originalEvent = {
            clipboardData: {
                types: ["text/html", "text/plain"],
                getData: function (type) {
                    return $p.get(0).outerHTML;
                }
            }
        };
        var $top = editor._paste_modal.getTopLevel();
        $top.one("shown.bs.modal", function () {
            // Wait until visible to add this handler so that it is
            // run after the callback that wed sets on the modal.
            $top.one("hidden.bs.modal",
                     function () {
                assert.equal($p.get(0).innerHTML, initial_value);
                dataCaretCheck(editor, initial, 0, "final position");
                done();
            });
        });
        editor.$gui_root.trigger(event);
        // This clicks "No".
        editor._paste_modal._$footer.find(".btn").get(1).click();
    });

    it("handles pasting structured text: invalid, accept pasting as text",
       function (done) {
        var $p = editor.$data_root.find(".body>.p").first();
        var initial = $p.get(0).childNodes[0];
        editor.setDataCaret(initial, 0);
        var initial_value = $p.get(0).innerHTML;
        var initial_outer = $p.get(0).outerHTML;
        var $x = $("<div>").append(document.createTextNode(initial_outer));
        var initial_outer_from_text_to_html = $x.get(0).innerHTML;

        // Synthetic event
        var event = new $.Event("paste");
        // Provide a skeleton of clipboard data
        event.originalEvent = {
            clipboardData: {
                types: ["text/html", "text/plain"],
                getData: function (type) {
                    return initial_outer;
                }
            }
        };
        var $top = editor._paste_modal.getTopLevel();
        $top.one("shown.bs.modal", function () {
            // Wait until visible to add this handler so that it is
            // run after the callback that wed sets on the modal.
            $top.one("hidden.bs.modal", function () {
                assert.equal($p.get(0).innerHTML,
                             initial_outer_from_text_to_html + initial_value);
                dataCaretCheck(editor, $p.get(0).childNodes[0],
                               initial_outer.length, "final position");
                done();
            });
        });
        editor.$gui_root.trigger(event);
        // This clicks "Yes".
        editor._paste_modal._$footer.find(".btn-primary").get(0).click();
    });

    it("handles cutting a well formed selection", function (done) {
        var p = editor.$data_root.find(".body>.p").get(0);
        var gui_start = editor.fromDataCaret(p.childNodes[0], 4);
        var gui_end = editor.fromDataCaret(p.childNodes[2], 5);
        editor.setCaret(gui_start);
        var range = rangy.createRange(editor.my_window.document);
        range.setStart(gui_start[0], gui_start[1]);
        range.setEnd(gui_end[0], gui_end[1]);
        rangy.getSelection(editor.my_window).setSingleRange(range);

        // Synthetic event
        var event = new $.Event("cut");
        editor.$gui_root.trigger(event);
        window.setTimeout(function () {
            assert.equal(p.innerHTML, "Blah.");
            done();
        }, 1);
    });

    it("handles cutting a bad selection", function (done) {
        var p = editor.$data_root.find(".body>.p").get(0);
        var original_inner_html = p.innerHTML;
        // Start caret is inside the term element.
        var gui_start = editor.fromDataCaret(p.childNodes[1].childNodes[0], 1);
        var gui_end = editor.fromDataCaret(p.childNodes[2], 5);
        editor.setCaret(gui_end);
        var range = rangy.createRange(editor.my_window.document);
        range.setStart(gui_start[0], gui_start[1]);
        range.setEnd(gui_end[0], gui_end[1]);
        rangy.getSelection(editor.my_window).setSingleRange(range);

        assert.equal(p.innerHTML, original_inner_html);
        var $top = editor.straddling_modal.getTopLevel();
        $top.one("shown.bs.modal", function () {
            // Wait until visible to add this handler so that it is
            // run after the callback that wed sets on the modal.
            $top.one("hidden.bs.modal",
                     function () {
                assert.equal(p.innerHTML, original_inner_html);
                caretCheck(editor, gui_end[0], gui_end[1],
                           "final position");
                done();
            });
        });
        // Synthetic event
        var event = new $.Event("cut");
        editor.$gui_root.trigger(event);
        // This clicks dismisses the modal
        editor.straddling_modal._$footer.find(".btn-primary").get(0).click();
    });

    describe("interacts with the server:", function () {
        before(function () {
            src_stack.unshift("../../test-files/wed_test_data" +
                              "/server_interaction_converted.xml");
        });

        after(function () {
            src_stack.shift();
        });

        beforeEach(function (done) {
            global.reset(done);
        });

        it("saves", function (done) {
            editor.addEventListener("saved", function () {
                $.get("/build/ajax/save.txt", function (data) {
                    var obj = {
                        command: 'save',
                        version: wed.version,
                        data: '<div xmlns="http://www.w3.org/1999/xhtml" \
data-wed-xmlns="http://www.tei-c.org/ns/1.0" class="TEI _real">\
<div class="teiHeader _real"><div class="fileDesc _real">\
<div class="titleStmt _real"><div class="title _real">abcd</div>\
</div><div class="publicationStmt _real"><div class="p _real">\
</div></div><div class="sourceDesc _real"><div class="p _real"></div>\
</div></div></div><div class="text _real"><div class="body _real">\
<div class="p _real">Blah blah <div class="term _real">blah</div> blah.</div>\
<div class="p _real"><div class="term _real">blah</div></div></div></div></div>'
                    };
                    var expected = "\n***\n" + JSON.stringify(obj);
                    assert.equal(data, expected);
                    done();
                });
            });
            editor.type(key_constants.CTRL_S);
        });
    });

    describe("fails as needed and recovers:", function () {
        before(function () {
            src_stack.unshift("../../test-files/wed_test_data/" +
                              "server_interaction_converted.xml");
        });

        after(function () {
            src_stack.shift();
        });

        beforeEach(function (done) {
            global.reset(done);
        });

        afterEach(function () {
            onerror.__test.reset();
        });

        it("tells the user to reload when save fails", function (done) {
            function doit() {
                var $modal = onerror.__test.$modal;
                $modal.on('shown.bs.modal', function () {
                    // Prevent a reload.
                    $modal.off('hide.bs.modal.modal');
                    $modal.modal('hide');
                    done();
                });

                editor.type(key_constants.CTRL_S);
            }

            global.fail_on_save(doit);

        });

        it("does not attempt recovery when save fails", function (done) {
            function doit() {
                var $modal = onerror.__test.$modal;
                $modal.on('shown.bs.modal', function () {
                    // Prevent a reload.
                    $modal.off('hide.bs.modal.modal');
                    $modal.modal('hide');
                    // The data was saved even though the server
                    // replied with an HTTP error code.
                    $.get("/build/ajax/save.txt", function (data) {
                        var obj = {
                            command: 'save',
                            version: wed.version,
                            data: '<div xmlns="http://www.w3.org/1999/xhtml" \
data-wed-xmlns="http://www.tei-c.org/ns/1.0" class="TEI _real">\
<div class="teiHeader _real"><div class="fileDesc _real">\
<div class="titleStmt _real"><div class="title _real">abcd</div>\
</div><div class="publicationStmt _real"><div class="p _real"></div>\
</div><div class="sourceDesc _real"><div class="p _real"></div></div>\
</div></div><div class="text _real"><div class="body _real">\
<div class="p _real">Blah blah <div class="term _real">blah</div> blah.</div>\
<div class="p _real"><div class="term _real">blah</div></div></div></div></div>'
                        };
                        var expected = "\n***\n" + JSON.stringify(obj);
                        assert.equal(data, expected);
                        done();
                    });
                });

                editor.type(key_constants.CTRL_S);
            }

            global.fail_on_save(doit);

        });

        it("attempts recovery on uncaught exception", function (done) {
            // We can't just raise an exception because mocha will
            // intercept it and it will never get to the onerror
            // handler. If we raise the error in a timeout, it will go
            // straight to onerror.

            window.setTimeout(function () {
                window.setTimeout(function () {
                    $.get("/build/ajax/save.txt", function (data) {
                        var obj = {
                            command: 'recover',
                            version: wed.version,
                            data: '<div xmlns="http://www.w3.org/1999/xhtml" \
data-wed-xmlns="http://www.tei-c.org/ns/1.0" class="TEI _real">\
<div class="teiHeader _real"><div class="fileDesc _real">\
<div class="titleStmt _real"><div class="title _real">abcd</div></div>\
<div class="publicationStmt _real"><div class="p _real"></div></div>\
<div class="sourceDesc _real"><div class="p _real"></div></div></div></div>\
<div class="text _real"><div class="body _real"><div class="p _real">Blah blah \
<div class="term _real">blah</div> blah.</div><div class="p _real">\
<div class="term _real">blah</div></div></div></div></div>'
                        };
                        var expected = "\n***\n" + JSON.stringify(obj);
                        assert.equal(data, expected);
                        done();
                    });
                }, 500);
                throw new Error("I'm failing!");
            }, 0);
        });
    });
});

});

//  LocalWords:  rng wedframe RequireJS dropdown Ctrl Mangalam MPL
//  LocalWords:  Dubeau previousSibling nextSibling abcd jQuery xmlns
//  LocalWords:  sourceDesc publicationStmt titleStmt fileDesc txt
//  LocalWords:  ajax xml moveCaretRight moveCaretLeft teiHeader html
//  LocalWords:  innerHTML nodeValue seekCaret nodeToPath pathToNode
//  LocalWords:  mouseup mousedown unhandled requirejs btn gui metas
//  LocalWords:  wedroot tei domutil onerror jquery chai
