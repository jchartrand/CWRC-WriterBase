const $ = require('jquery');
const Mapper = require('../../schema/mapper');

require('jquery-ui/ui/widgets/accordion');
require('jquery-ui/ui/widgets/tooltip');

function AttributeWidget(config) {
    this.w = config.writer;
    this.$el = config.$el; // the el to add the attribute widget to
    this.$parent = config.$parent; // the parent form (optional)
    
    this.showSchemaHelp = config.showSchemaHelp === true ? true : false;
    const schemaHelpEl = this.showSchemaHelp ? '<div class="schemaHelp"></div>' : '';
    // if (this.showSchemaHelp) schemaHelpEl = '<div class="schemaHelp"></div>';
    
    this.mode = AttributeWidget.ADD;
    
    this.isDirty = false;
    
    this.$el.addClass('attributeWidget');

    this.$el.append(`
        <div class="attributeSelector">
            <h2>Attributes</h2>
            <ul></ul>
        </div>
            <div class="attsContainer">
        </div>
        ${schemaHelpEl}
    `);
    
    if (this.$parent !== undefined) {
        // add listeners for other form elements
        $('[data-mapping]', this.$parent).each($.proxy(function(index, el) {
            const formEl = $(el);
            const type = formEl.data('type');
            const mapping = formEl.data('mapping');

            // check the mapping to make sure it's an attribute
            // TODO if the data-type is hidden then the attribute should not be modifiable in this widget
            if (mapping.indexOf('custom.') === -1 && mapping.indexOf('prop.') === -1) {
                let changeEl;
                if (type === 'radio') {
                    changeEl = $('input', formEl);
                } else if (type === 'textbox' || type === 'select') {
                    changeEl = formEl;
                }
                if (changeEl !== undefined) {
                    changeEl.change($.proxy(function(mapping, e) {
                        const dataObj = {};
                        dataObj[mapping] = $(e.target).val();
                        this.setData(dataObj);
                    }, this, mapping));
                }
            }
        }, this));
    }
}

AttributeWidget.ADD = 0;
AttributeWidget.EDIT = 1;

AttributeWidget.prototype = {
    constructor: AttributeWidget,
    
    buildWidget: function(atts, initialVals, tag) {
        initialVals = initialVals || {};
        
        $('.attributeSelector ul, .attsContainer, .schemaHelp', this.$el).empty();
        this.isDirty = false;
        
        if (this.showSchemaHelp && tag !== undefined) {
            let helpText = this.w.schemaManager.getDocumentationForTag(tag);
            if (helpText !== '') {
                $('.schemaHelp', this.$el).html(`<h3>${tag} Documentation</h3><p>${helpText}</p>`);
            }
        }
        
        atts.sort((a, b) => {
            if (a.name > b.name) {
                return 1;
            } else if (a.name < b.name) {
                return -1;
            }
            return 0;
        });

        const disallowedAttributes = Mapper.reservedAttributes;
        
        // build atts
        let attsString = '';
        let attributeSelector = '';
        let att;
        let currAttString;
        let isRequired = false;

        for (let i = 0; i < atts.length; i++) {
            att = atts[i];
            currAttString = '';
            isRequired = att.required;
            
            if (disallowedAttributes[att.name] !== true) {
                let displayName = att.name;
                if (att.fullName !== '') {
                    displayName += ` (${att.fullName})`;
                    // displayName += ' ('+att.fullName+')';
                }

                att.defaultValue = '';
                let display = 'block';
                const requiredClass = isRequired ? ' required' : '';

                if (initialVals[att.name] && initialVals[att.name] !== undefined) {
                    display = 'block';
                    attributeSelector += `<li data-name="${att.name}" class="selected${requiredClass}">${displayName}</li>`;
                    att.defaultValue = initialVals[att.name];
                } else {
                    display = 'none';
                    attributeSelector += `<li data-name="${att.name}" class="${requiredClass}">${displayName}</li>`;
                }

                currAttString += `<div data-name="form_${att.name}" style="display:${display};"><label>${displayName}</label>`;
                if (typeof att.documentation === 'string' && att.documentation !== '') { // docs will be objects if the doc element was empty
                    currAttString += `<ins class="ui-icon ui-icon-help" title="${att.documentation}">&nbsp;</ins>`;
                }

                currAttString += '<br/>';

                // TODO add list support
//                if ($('list', attDef).length > 0) {
//                    currAttString += '<input type="text" name="'+att.name+'" value="'+att.defaultValue+'"/>';
//                } else if ($('choice', attDef).length > 0) {
                if (att.choices && att.choices.length > 0) {
                    currAttString += `<select name="${att.name}">`;
                    let attVal;
                    let selected;
                    for (let j = 0; j < att.choices.length; j++) {
                        attVal = att.choices[j];
                        selected = att.defaultValue == attVal ? ' selected="selected"' : '';
                        currAttString += `<option value="${attVal}"${selected}>${attVal}</option>`;
                    }
                    currAttString += '</select>';
//                } else if ($('ref', attDef).length > 0) {
//                    currAttString += '<input type="text" name="'+att.name+'" value="'+att.defaultValue+'"/>';
                } else {
                    currAttString += `<input type="text" name="${att.name}" value="${att.defaultValue}"/>`;
                }
                
                if (isRequired) currAttString += ' <span class="required">*</span>';
                currAttString += '</div>';
                
                attsString += currAttString;
            }
        }
        
        $('.attributeSelector ul', this.$el).html(attributeSelector);
        $('.attsContainer', this.$el).html(attsString);
        
        $('.attributeSelector li', this.$el).click(function() {
            const name = $(this).data('name').replace(/:/g, '\\:');
            const div = $(`[data-name="form_${name}"]`, this.$el);
            $(this).toggleClass('selected');
            $(this).hasClass('selected') ? div.show() : div.hide();
            // if ($(this).hasClass('selected')) {
            //     div.show();
            // } else {
            //     div.hide();
            // }
        });
        
        $('ins', this.$el).tooltip({
            show: false,
            hide: false,
            classes: { 'ui-tooltip': 'cwrc-tooltip' }
        });
        
        $('input, select, option', this.$el).change(function(event) {
            this.isDirty = true;
        });
//        .keyup(function(event) {
//            if (event.keyCode == '13') {
//                event.preventDefault();
//                if (this.isDirty) t.result();
//                else t.cancel(); 
//            }
//        });
        
        $('select, option', this.$el).click(function(event) {
            this.isDirty = true;
        });
    },
    reset: function() {
        $('.attributeSelector li', this.$el).each(function(el, index) {
            $(this).removeClass('selected');
            const name = $(this).data('name').replace(/:/g, '\\:');
            const div = $(`[data-name="form_${name}"]`, this.$el);
            div.hide();
        });
        $('.attsContainer input, .attsContainer select', this.$el).val('');
    },
    /**
     * Sets the attribute data for the widget.
     * @param {Object} data A map of attribute name / value pairs
     * @returns {Boolean} True if data was set
     */
    setData: function(data) {
        let wasDataSet = false;
        for (const key in data) {
            const val = data[key];
            wasDataSet = this.setAttribute(key, val) || wasDataSet;
        }
        return wasDataSet;
    },
    /**
     * Set a single attribute value for the widget.
     * If the value is undefined or null then it is removed.
     * @param {String} name Attribute name
     * @param {String} value Attribute value
     * @returns {Boolean} True if data was set
     */
    setAttribute: function(name, value) {
        const li = $(`.attributeSelector li[data-name="${name}"]`, this.$el);
        if (li.length === 1) {
            if (value != null) {
                li.addClass('selected');
                const div = $(`[data-name="form_${name}"]`, this.$el);
                $('input, select', div).val(value);
                div.show();
            } else {
                li.removeClass('selected');
                const div = $(`[data-name="form_${name}"]`, this.$el);
                $('input, select', div).val('');
                div.hide();
            }
            return true;
        } else {
            console.warn('attributeWidget: no attribute for',name);
            return false;
        }
    },
    
    /**
     * Collects the data from the attribute widget and performs validation.
     * @returns {Object|undefined} Returns undefined if invalid
     */
    getData: function() {
        const attributes = {};
        $('.attributeSelector li.selected', this.$el).each((index, el) => {
            const name = $(el).data('name');
            $(`.attsContainer > div[data-name="form_${name}"]`, this.$el).children('input[type!="hidden"], select').each(function(index, el) {
                const val = $(this).val();
                if (val !== '') { // ignore blank values
                    attributes[$(this).attr('name')] = val;
                }
            });
        });
        
        // validation
        const invalid = [];
        $('.attsContainer span.required', this.$el).parent().children('input[type!="hidden"], select').each(function(index, el) {
            const entry = attributes[$(this).attr('name')];
            if (entry === undefined || entry == '') {
                invalid.push($(this).attr('name'));
            }
        });
        if (invalid.length > 0) {
            for (let i = 0; i < invalid.length; i++) {
                const name = invalid[i];
                $(`.attsContainer *[name="${name}"]`, this.$el).css({borderColor: 'red'}).keyup(function(event) {
                    $(this).css({borderColor: '#ccc'});
                });
            }
            return attributes; // still return values even if invalid (for now)
        }
        
        return attributes;
    },
    
    expand: function() {
        this.$el.parent('[data-transform="accordion"]').accordion('option', 'active', 0);
    },
    collapse: function() {
        this.$el.parent('[data-transform="accordion"]').accordion('option', 'active', false);
    },
    destroy: function() {
        try {
            $('ins', this.$el).tooltip('destroy');
        } catch (e) {
            if (console) console.log('error destroying tooltip');
        }
    }
};

module.exports = AttributeWidget;