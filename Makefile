-include local.mk

#
# Customizable variables. Set them in a local.mk file rather than
# modify this file. What follows are the default values.
#

# saxon command
SAXON?=saxon

# jsdoc command.
JSDOC3?=jsdoc

# rst2html command.
RST2HTML?=rst2html

# Build a development version? Set to 1 if yes.
DEV?=0

# Parameters to pass to mocha, like "--grep foo".
MOCHA_PARAMS?=

# Parameters to pass to behave
BEHAVE_PARAMS?=

# Skip the semver check. You should NOT set this in local.mk but use
# it on the command line:
#
# $ make SKIP_SEMVER=1 test
#
SKIP_SEMVER?=

#
# End of customizable variables.
#

# Should be the last part of the URL beginning with
# https://rangy.googlecode.com/files/
RANGY_FILE=rangy-1.3alpha.772.tar.gz

JQUERY_FILE=jquery-1.9.1.js

BOOTSTRAP_URL=https://github.com/twbs/bootstrap/archive/v3.0.0.zip
BOOTSTRAP_BASE=bootstrap-$(notdir $(BOOTSTRAP_URL))
FONTAWESOME_PATH=http://fortawesome.github.io/Font-Awesome/assets/
FONTAWESOME_FILE=font-awesome.zip

TEXT_PLUGIN_FILE=https://raw.github.com/requirejs/text/latest/text.js
TEXT_PLUGIN_BASE=$(notdir $(TEXT_PLUGIN_FILE))

LOG4JAVASCRIPT_FILE=http://downloads.sourceforge.net/project/log4javascript/log4javascript/1.4.6/log4javascript-1.4.6.zip
LOG4JAVASCRIPT_BASE=$(notdir $(LOG4JAVASCRIPT_FILE))

BOOTSTRAP_GROWL_FILE=https://github.com/ifightcrime/bootstrap-growl/archive/v1.1.0.zip
BOOTSTRAP_GROWL_BASE=bootstrap-growl-$(notdir $(BOOTSTRAP_GROWL_FILE))

PURL_URL=https://github.com/allmarkedup/purl/archive/v2.3.1.zip
PURL_BASE=purl-$(notdir $(PURL_URL))

LIB_FILES:=$(shell find lib -type f -not -name "*_flymake.*")
STANDALONE_LIB_FILES:=$(foreach f,$(LIB_FILES),$(patsubst %.less,%.css,build/standalone/$f))
TEST_DATA_FILES:=$(shell find browser_test -type f -name "*.xml")
CONVERTED_TEST_DATA_FILES:=$(foreach f,$(TEST_DATA_FILES),$(patsubst browser_test/%.xml,build/test-files/%_converted.xml,$f))
# Use $(sort ...) to remove duplicates.
CONFIG_TARGETS:=$(sort $(foreach f,$(shell find config local_config -type f -printf '%P\n'),$(patsubst %,build/config/%,$f)))
CONFIG_DEPS:=$(CONFIG_TARGETS:=.d)
HTML_TARGETS:=$(patsubst %.rst,%.html,$(wildcard *.rst))

.DELETE_ON_ERROR:

.PHONY: all build-dir build
all: build

build-dir:
	-@[ -e build ] || mkdir build

build: | build-standalone-optimized build-ks-files build-config

build-config: $(CONFIG_TARGETS) | build/config

build/config: | build-dir
	mkdir $@

#
# What we've got here is a poor man's dependency calculation system.
#
# The .d files record whether make is to take the source for the
# corresponding file in build/config from config or local_config.
#

include $(CONFIG_DEPS)

.PHONY: $(CONFIG_DEPS)
$(CONFIG_DEPS): DEP_FOR=$(@:.d=)
$(CONFIG_DEPS): DEP_FOR_BASE=$(notdir $(DEP_FOR))
$(CONFIG_DEPS): | build/config
	@echo "Computing $@"
	@if [ -e local_config/$(DEP_FOR_BASE) ]; then \
		echo '$(DEP_FOR): local_config/$(DEP_FOR_BASE)' > $@.t; \
	else \
		echo '$(DEP_FOR): config/$(DEP_FOR_BASE)' > $@.t; \
	fi
# If the dependencies have changed in any way, delete the target so that it
# is rebuilt.
	@if ! diff -qN $@.t $@ > /dev/null; then \
		rm -rf $(DEP_FOR); \
		mv $@.t $@; \
	else \
		rm $@.t; \
	fi

# Here are the actual targets that build the actual config files.
build/config/%:
	cp $< $@

build/config/nginx.conf:
	sed -e's;@PWD@;$(PWD);'g $< > $@

build-standalone: $(STANDALONE_LIB_FILES) build/standalone/test.html build/standalone/wed_test.html build/standalone/kitchen-sink.html build/standalone/requirejs-config.js build/standalone/lib/external/rangy build/standalone/lib/external/$(JQUERY_FILE) build/standalone/lib/external/bootstrap build/standalone/lib/requirejs/require.js build/standalone/lib/requirejs/text.js build/standalone/lib/salve build/standalone/lib/external/log4javascript.js build/standalone/lib/external/jquery.bootstrap-growl.js build/standalone/lib/external/font-awesome

build/standalone/requirejs-config.js: build/config/requirejs-config-dev.js
	cp $< $@

build/standalone/%.html: web/%.html
	cp $< $@

build-standalone-optimized: build-standalone build/standalone-optimized build/standalone-optimized/requirejs-config.js build/standalone-optimized/test.html build/standalone-optimized/wed_test.html build/standalone-optimized/kitchen-sink.html

build/standalone-optimized/requirejs-config.js: build/config/requirejs-config-optimized.js | build/standalone-optimized
	cp $< $@

build/standalone-optimized: requirejs.build.js $(shell find build/standalone -type f)
# The || in the next command is because DELETE_ON_ERROR does not
# delete *directories*. So we have to do it ourselves.
	node_modules/requirejs/bin/r.js -o $< || (rm -rf $@ && exit 1)

build/standalone-optimized/%.html: web/%.html
	cp $< $@

build/config/requirejs-config-optimized.js: misc/create_optimized_config.js build/config/requirejs-config-dev.js requirejs.build.js
	node $(word 1,$^) $(word 2,$^) $(word 3,$^) requirejs.build.js > build/config/requirejs-config-optimized.js

build-ks-files: build/ks/purl.js

build-test-files: $(CONVERTED_TEST_DATA_FILES) build/ajax

build/test-files/%_converted.xml: browser_test/%.xml build/standalone/lib/wed/xml-to-html.xsl test/xml-to-html-tei.xsl
	-[ -e $(dir $@) ] || mkdir -p $(dir $@)
	(if grep "http://www.tei-c.org/ns/1.0" $<; then \
		$(SAXON) -s:$< -o:$@ -xsl:test/xml-to-html-tei.xsl; else \
		$(SAXON) -s:$< -o:$@ -xsl:lib/wed/xml-to-html.xsl; \
	fi)

build/standalone/lib/%: lib/%
	-[ -e $(dir $@) ] || mkdir -p $(dir $@)
	cp $< $@

build/standalone/lib/%.css: lib/%.less
	lessc $< $@

build/standalone build/ajax: | build-dir
	-mkdir $@

downloads:
	mkdir $@

downloads/$(RANGY_FILE): | downloads
	(cd downloads; wget 'https://rangy.googlecode.com/files/$(RANGY_FILE)' )

downloads/$(JQUERY_FILE): | downloads
	(cd downloads; wget 'http://code.jquery.com/$(JQUERY_FILE)' )

downloads/$(BOOTSTRAP_BASE): | downloads
	(cd downloads; wget -O $(BOOTSTRAP_BASE) '$(BOOTSTRAP_URL)')

downloads/$(FONTAWESOME_FILE): | downloads
	(cd downloads; wget '$(FONTAWESOME_PATH)$(FONTAWESOME_FILE)')

downloads/$(TEXT_PLUGIN_BASE): | downloads
	(cd downloads; wget $(TEXT_PLUGIN_FILE))

downloads/$(LOG4JAVASCRIPT_BASE): | downloads
	(cd downloads; wget $(LOG4JAVASCRIPT_FILE))

downloads/$(BOOTSTRAP_GROWL_BASE): | downloads
	(cd downloads; wget -O $(BOOTSTRAP_GROWL_BASE) $(BOOTSTRAP_GROWL_FILE))

downloads/$(PURL_BASE): | downloads
	(cd downloads; wget -O $(PURL_BASE) $(PURL_URL))

node_modules/%:
	npm install

build/standalone/lib/external/rangy: downloads/$(RANGY_FILE) | build/standalone
	-mkdir -p $@
	rm -rf $@/*
	tar -xzf $< --strip-components=1 -C $@
ifneq ($(DEV),0)
	mv $@/uncompressed/* $@
endif # ifneq ($(DEV),0)
	rm -rf $@/uncompressed

build/standalone/lib/external/$(JQUERY_FILE): downloads/$(JQUERY_FILE) | build/standalone/lib
	-mkdir $(dir $@)
	cp $< $@

build/standalone/lib/external/bootstrap: downloads/$(BOOTSTRAP_BASE) | build/standalone/lib
	-mkdir $(dir $@)
	rm -rf $@/*
	unzip -d $(dir $@) $<
	-mkdir $@
	mv $(dir $@)/bootstrap-*/dist/* $@
	rm -rf $(dir $@)/bootstrap-*
# unzip preserves the creation date of the bootstrap directory. Which
# means that downloads/bootstrap.zip would likely be more recent than
# the top level directory. This would trigger this target needlessly
# so, touch it.
	touch $@

build/standalone/lib/external/font-awesome: downloads/$(FONTAWESOME_FILE) | build/standalone/lib/
	-mkdir $(dir $@)
	rm -rf $@/*
	unzip -d $(dir $@) $<
	rm -rf $@/scss
	rm -rf $@/less
	touch $@

build/standalone/lib/external/jquery.bootstrap-growl.js: downloads/$(BOOTSTRAP_GROWL_BASE) | build/standalone/lib
	unzip -d $(dir $@) $<
ifneq ($(DEV),0)
	mv $(dir $@)/bootstrap-growl-*/jquery.bootstrap-growl.js $@
else
	mv $(dir $@)/bootstrap-growl-*/jquery.bootstrap-growl.min.js $@
endif
	rm -rf $(dir $@)/bootstrap-growl-*
	touch $@

build/standalone/lib/requirejs: | build/standalone/lib
	-mkdir $@

build/standalone/lib/requirejs/require.js: node_modules/requirejs/require.js | build/standalone/lib/requirejs
	cp $< $@

build/standalone/lib/requirejs/text.js: downloads/text.js | build/standalone/lib/requirejs
	cp $< $@

build/standalone/lib/external/log4javascript.js: downloads/$(LOG4JAVASCRIPT_BASE)
	-mkdir $(dir $@)
	unzip -d $(dir $@) $< log4javascript-*/js/*.js
ifneq ($(DEV),0)
	mv $(dir $@)/log4javascript-*/js/log4javascript_uncompressed.js $@
else
	mv $(dir $@)/log4javascript-*/js/log4javascript.js $@
endif
	rm -rf $(dir $@)/log4javascript-*
	touch $@

# The following targets need to have an order dependency on the top
# directories so that when a new version is installed, the target is
# rebuilt. This is necessary because npm preserves the modification
# times of the files *inside* the packages.

build/standalone/lib/salve: node_modules/salve/build/lib/salve
	rm -rf $@
	cp -rp $< $@
# Sometimes the modification date on the top directory does not
# get updated, so:
	touch $@

build/ks:
	mkdir $@

build/ks/purl.js: downloads/$(PURL_BASE) | build/ks
	rm -rf $@
	unzip -j -d $(dir $@) $< */$(notdir $@)
	touch $@

.PHONY: test
test: build | build-test-files
ifndef SKIP_SEMVER
	semver-sync -v
endif
	mocha $(MOCHA_PARAMS)

.PHONY: selenium-test
selenium-test: build | build-test-files
	behave $(BEHAVE_PARAMS) selenium_test

.PHONY: doc
doc: rst-doc
	$(JSDOC3) -c jsdoc.conf.json -d build/doc -r lib

rst-doc: $(HTML_TARGETS)

# rst2html does not seem to support rewriting relative
# urls. So we produce the html in our root.
%.html: %.rst
# The perl script is an ugly hack. It would erroneously mangle
# plaintext that would happen to match the pattern. We need a better
# solution eventually.
	$(RST2HTML) $< | perl -np -e 's/href="(.*?)\.rst(#.*?)"/href="$$1.html$$2"/g' > $@

.PHONY: clean
clean:
	-rm -rf build
	-rm $(HTML_TARGETS)

.PHONY: distclean
distclean: clean
	-rm -rf downloads
