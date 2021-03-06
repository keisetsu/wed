Please note that Github currently does not implement all
reStructuredText directives, so some links in this README
may not work correctly when viewed there.

Introduction
============

Wed is a schema-aware editor for XML documents. It runs in a web
browser. It is alpha software. We aim to make it extensible, but the API
is likely to change quickly for now. If you try it, do not be
surprised if it throws a rod and leaks oil on your carpet.

Known limitations:

* Wed currently only understands a subset of Relax NG (through the
  `salve <https://github.com/mangalam-research/salve/>`_ package).

* Wed does not currently support editing attributes in a
  generic way *as attributes*. The functionality just has not been
  implemented **yet** because wed is developed in the context of a
  project where all attributes are set by software or are edited
  through domain-specific abstractions rather than directly, as
  attributes. Other features are more pressing.

* Eventually the plan is to handle XML namespace
  changes completely, and there is incipient code to deal with this; for now
  the safe thing to do if you have a file using multiple namespaces is
  to declare them once and for all on the top element, and never
  change them throughout the document. Otherwise, problems are likely.

* We've not tested a setup in which more than one wed instance appears
  on the same page.

* Keyboard navigation in contextual menus works. However, if the mouse
  is hovering over menu items, two items will be highlighted at once,
  which may be confusing. This seems to be a limitation of CSS which
  Bootstrap does nothing to deal with. (One element may be in the
  focused state (keyboard) while another is in the hover state.)

* Wed does not work with RTL scripts. There no inherent reason wed
  could not support them but the project for which it is developed
  currently does not need support for RTL scripts. So no resources
  have been expended towards supporting this.

* Wed is not internationalized. Although the contents of a document
  could be in any language, wed's UI is in English. Again, there is no
  inherent reason wed could not support other languages for the
  UI. The project for which it is developed currently does not need
  support for other languages, hence this state of affairs.

* See also `Browser Requirements`_.

Known bugs:

* Firefox: Sometimes a caret moved to the end of a bit of text
  disappears. There does not seem to be any rhyme or reason for it. It
  is probably a Firefox bug. At any rate, wed does not currently
  compensate for it. So you may see your caret disappear, but it is
  still there, waiting for you to type text.

Browser Requirements
====================

While potential users of wed should definitely heed the warnings
below, we have started testing wed on SauceLab's server under their
OpenSauce program so support for various platforms should improve.

Wed is primarily developed using a recent version of Chrome (version
29; versions 26, 27 and 28 have also been used earlier) and a recent
version of Firefox (version 24; versions 20, 21, 22 and 23 have also
been used earlier) for testing. Ideally wed should work with recent
versions of other browsers but since it is not routinely tested with
those browsers there may be bugs specific to running wed in those
browsers. File an issue in github if you find a problem with IE 9 or
higher or a relatively recent other kind of desktop browser or
(obviously) with the browsers used for testing wed.  Due to a lack of
development resources, the following items are unlikely to ever be
supported, in decreasing order of likelihood:

* Browsers for phones and tablets.

* Versions of Chrome and Firefox older than those mentioned above.

* Versions of IE older than 9.

* Antique browsers.

* Oddball browsers or other software or hardware systems that present
  web pages.

* Operating systems or browsers no longer supported by their own
  vendors.

Wed does not require any specific OS facilities. However, keyboard
support on Macs in JavaScript has some peculiarities. Unfortunately,
since this project has not so far benefited from access to a Mac for
testing, users of Mac-based browsers may experience issues that do not
exist on other platforms. File an issue in github if you find a
problem with a relatively recent Mac-based browser.

Dependencies
============

Wed is packaged as a RequireJS module. So to use it in a browser
environment, you need to first load RequireJS and pass to it a
configuration that will allow it to find wed's code. An example of
such configuration, which allows running the browser-dependent test
suite, is located in `<config/requirejs-config-dev.js>`_.

.. warning:: If you want to change this configuration for
             experimentation or to match your local setup, please copy
             it to the `<local_config>` directory and edit it
             *there*. This directory is not tracked by git.

In all cases Wed requires the following packages:

* jquery 1.9.1 or higher
* Bootstrap version 3.0.0 or a later version in the version 3 series.
* `salve <https://github.com/mangalam-research/salve/>`_
* rangy, together with its ``selectionsaverestore`` module.
* bootstrap-growl

Loading wed in a Node.js environment requires installing the
following node package:

* node-amd-loader

Building wed **additionally** requires the following node packages:

* less

Since wed is not yet distributed in a pre-compiled form, you
effectively need these packages installed if you
want to use wed because you have to build it first.

Building wed's documentation **additionally** requires the following
packages:

* jsdoc3
* rst2html
* perl (a stop-gap measure which we plan to get rid of eventually)

Running wed's tests **additionally** requires the following node
packages:

* mocha
* chai
* semver-sync
* express

Please see the `<package.json>`_, `<config/requirejs-config-dev.js>`_
and `<Makefile>`_ files for details regarding these
dependencies. Running the test suite also requires that `saxon
<http://saxon.sourceforge.net/>`_ be installed.

Running wed's selenium-based tests **additionally** requires the
following:

* Python 2.7.
* Python's Selenium package.
* `selenic <http://gihub.com/mangalam-research/selenic>`_
* behave (the python package)
* nginx is highly recommended.

If you want to contribute to salve, your code will have to pass the
checks listed in `<.glerbl/repo_conf.py>`_. So you either have to
install glerbl to get those checks done for you or run the checks
through other means. See Contributing_.

Building
========

Everything generated during a build is output to the `<build>`_
subdirectory, except for some documentation files like
`<README.html>`_ and `<CHANGELOG.html>`_ which are in the root
directory.

For now, wed uses a Makefile to build itself. You might want to create
a ``local.mk`` file to record settings specific to your own build
environment. See the start of the `<Makefile>`_ to see what variables
you can set. When everything is set, run::

    $ make

.. warning:: If you get a failure please try issuing ``make`` a second
             time. There are some (rare) usage scenarios in which make
             can get confused about its dependencies. A second run
             clears it up.

This Makefile will download external packages (like jquery and
Bootstrap) and place them in `<downloads>`_. It will then create a
tree of files that could be served by a web server. The files will be
in `<build/standalone>`_. As the name "standalone" implies, this build
includes **everything** needed to run wed on your own server, except
the configuration for RequireJS.

Make will additionally create an optimized version of wed in
`<build/standalone-optimized>`_. This is a version that has been
optimized using RequireJS' ``r.js`` optimizer. This optimization
exists for illustration purposes and for testing wed. See the
"Deployment Considerations" section in the `<tech_notes.rst>`_ file to
determine whether this is the optimization you want to use to deploy
wed.

Testing
=======

See `<tech_notes.rst>`_.

Demo
====

To see the demo, you must have a minimal server running just like the
one needed to run the browser-dependent test suite (see the
"In-Browser Tests" section in `<tech_notes.rst>`_) and then point your
browser to either:

* `<http://localhost:8888/build/standalone/kitchen-sink.html>`_ to
  view the demo with the unoptimized file tree.

* or
  `<http://localhost:8888/build/standalone-optimized/kitchen-sink.html>`_
  to view the demo with an optimized file tree.

The demo currently starts with an empty document using a vanilla TEI
schema. Things you can do:

* Use the left mouse button to bring up a context menu. Such a menu
  exists for starting tags and all positions that are editable. This
  menu allows inserting elements. Ctrl-/ also brings up this menu.

* Insert text where text is valid.

* Ctrl-Z to undo.

* Ctrl-Y to redo.

* Ctrl-C to copy.

* Ctrl-V to paste.

* Ctrl-X to cut.

* Ctrl-S to save. The data is currently dumped into a file located at
  `<build/ajax/save.txt>`_, and you won't be able to reload it. For full
  functionality wed needs to be used with a server able to save the
  data and serve it intelligently.

* Ctrl-` to go into development mode. This will bring up a log window
  and allow the use of F2 to dump the element to the console.

It is possible to run the kitchen sink with a different mode than the
default one (generic) by passing a ``mode`` parameter in the URL, for
instance the URL
`<http://localhost:8888/web/kitchen-sink.html?mode=tei>`_ would tell
the kitchen sink to load the tei mode.

Using
=====

Wed expects the XML files it uses to have been converted from XML to
an ad-hoc HTML version. So the data passed to it must have been
converted by `<lib/wed/xml-to-html.xsl>`_. Various schemas and projects
will have different needs regarding white space handling, so it is
likely you'll want to create your own ``xml-to-html.xsl`` file that will
import `<lib/wed/xml-to-html.xsl>`_ but customize white space handling.

To include wed in a web page you must:

* Require `<lib/wed/wed.js>`_

* Instantiate an ``Editor`` object of that module as follows::

    var editor = new wed.Editor();
    [...]
    editor.init(widget, options);

  Between the creation of the ``Editor`` object and the call to
  ``init``, there conceivably could be some calls to add event
  handlers or condition handlers. The ``widget`` parameter must be an
  element (preferably a ``div``) which contains the entire data
  structure to edit (converted by ``xml-to-html.xsl`` or a
  customization of it). The ``options`` parameter is a dictionary
  which at present understands the following keys:

  + ``schema``: the path to the schema to use for interpreting the
    document. This file must contain the result of doing the schema
    conversion required by salve since wed uses salve. See
    salve's documentation.

  + ``mode``: a simple object recording mode parameters. This object
    must have a ``path`` field set to the RequireJS path of the
    mode. An optional ``options`` field may contain options to be
    passed to the mode. Wed comes bundled with a generic mode located
    at `<lib/wed/modes/generic/generic.js>`_.

    The ``path`` field may be abbreviated. For instance if wed is
    given the path ``"foo"``, it will try to load the module
    ``foo``. If this fails, it will try to load ``modes/foo/foo``.  If
    this fails, it will try to load ``modes/foo/foo_mode``. These
    paths are all relative to the wed directory.

  If ``options`` is absent, wed will attempt getting its configuration
  from RequireJS by calling ``module.config()``. See the RequireJS
  documentation. The ``wed/wed`` configuration in
  `<config/requirejs-config-dev.js>`_ gives an example of how this can
  be used.

Here is an example of an ``options`` object::

    {
         schema: 'test/tei-simplified-rng.js',
         mode: {
             path: 'wed/modes/generic/generic',
             options: {
                 meta: 'test/tei-meta'
             }
         }
    }

The ``mode.options`` will be passed to the generic mode when it is
created. What options are accepted and what they mean is determined by
each mode.

The `<lib/wed/onerror.js>`_ module installs a global onerror
handler. By default it calls whatever onerror handler already existed
at the time of installation. Sometimes this is not the desired
behavior (for instance when testing with ``mocha``). In such cases the
``suppress_old_onerror`` option set to a true value will prevent the
module from calling the old onerror.

.. warning:: Wed installs its own handler so that if any error occurs
             it knows about it, attempts to save the data and forces
             the user to reload. The unfortunate upshot of this is
             that any other JavaScript executing on a page where wed
             is running could trip wed's onerror handler and cause wed
             to think it crashed. For this reason you must not run
             wed with JavaScript code that causes onerror to fire.

Round-Tripping
==============

The transformations performed by `<lib/wed/xml-to-html.xsl>`_ and
`<lib/wed/html-to-xml.xsl>`_ are not byte-for-byte reverse
operations. Suppose document A is converted from xml to html, remains
unmodified, and is converted back and saved as B, B will **mean** the
same thing as A but will not necessarily be **identical** to A. Here are
the salient points:

* Comments, CDATA, and processing instructions are lost.

* The order of attributes could change.

* The order and location of namespaces could change.

* The encoding of empty elements could change. That is, ``<foo/>`` could
  become ``<foo></foo>`` or vice-versa.

* The presence or absence of a newline on the last line may not be
  preserved.

Contributing
============

Contributions must pass the commit checks turned on in
`<.glerbl/repo_conf.py>`_. Use ``glerbl install`` to install the
hooks. Glerbl itself can be found at
https://github.com/lddubeau/glerbl. It will eventually make its way to
the Python package repository so that ``pip install glerbl`` will
work.

License
=======

Wed is released under the `Mozilla Public
License version 2.0 <http://www.mozilla.org/MPL/2.0/>`_. Copyright Mangalam
Research Center for Buddhist Languages, Berkeley, CA.

Credits
=======

Wed is designed and developed by Louis-Dominique Dubeau, Director of
Software Development for the Buddhist Translators Workbench project,
Mangalam Research Center for Buddhist Languages.

.. image:: https://secure.gravatar.com/avatar/7fc4e7a64d9f789a90057e7737e39b2a
   :target: http://www.mangalamresearch.org/

This software has been made possible in part by a Level I Digital Humanities
Start-up Grant and a Level II Digital Humanities Start-up Grant from the
National Endowment for the Humanities (grant numbers HD-51383-11 and
HD-51772-13). Any views, findings, conclusions, or recommendations expressed
in this software do not necessarily represent those of the National Endowment
for the Humanities.

.. image:: http://www.neh.gov/files/neh_logo_horizontal_rgb.jpg
   :target: http://www.neh.gov/

..  LocalWords:  API html xml xsl wed's config jquery js chai semver
..  LocalWords:  json minified localhost CSS init pre Makefile saxon
..  LocalWords:  barebones py TEI Ctrl hoc schemas CDATA HD glyphicon
..  LocalWords:  getTransformationRegistry getContextualActions addr
..  LocalWords:  fireTransformation glyphicons github tei onerror ev
..  LocalWords:  domlistener TreeUpdater makeDecorator jQthis README
..  LocalWords:  selectionsaverestore CHANGELOG RTL UI setTimeout rst
..  LocalWords:  nginx SauceLabs SauceLab's OpenSauce readme Glerbl
..  LocalWords:  reStructuredText namespace namespaces RequireJS
..  LocalWords:  Dubeau Mangalam
