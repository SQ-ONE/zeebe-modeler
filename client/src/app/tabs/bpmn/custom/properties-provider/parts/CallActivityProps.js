/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

import elementHelper from 'bpmn-js-properties-panel/lib/helper/ElementHelper';

import cmdHelper from 'bpmn-js-properties-panel/lib/helper/CmdHelper';

import extensionElementsHelper from 'bpmn-js-properties-panel/lib/helper/ExtensionElementsHelper';

import {
  is,
  getBusinessObject
} from 'bpmn-js/lib/util/ModelUtil';

import {
  classes as domClasses
} from 'min-dom';

import {
  escapeHTML
} from 'bpmn-js-properties-panel/lib/Utils';

import entryFactory from 'bpmn-js-properties-panel/lib/factory/EntryFactory';

export default function(group, element, bpmnFactory, translate) {

  if (!is(element, 'bpmn:CallActivity')) {
    return;
  }

  function getProperty(element, propertyName) {
    const businessObject = getBusinessObject(element),
          calledElement = getCalledElement(businessObject);

    return calledElement ? calledElement.get(propertyName) : '';
  }

  function setProperties(element, values) {

    const businessObject = getBusinessObject(element),
          commands = [];

    // ensure extensionElements
    let extensionElements = businessObject.get('extensionElements');
    if (!extensionElements) {
      extensionElements = elementHelper.createElement('bpmn:ExtensionElements', { values: [] }, businessObject, bpmnFactory);
      commands.push(cmdHelper.updateBusinessObject(element, businessObject, { extensionElements: extensionElements }));
    }

    // ensure zeebe:calledElement
    let calledElement = getCalledElement(businessObject);
    if (!calledElement) {
      calledElement = elementHelper.createElement('zeebe:CalledElement', { }, extensionElements, bpmnFactory);
      commands.push(cmdHelper.addAndRemoveElementsFromList(
        element,
        extensionElements,
        'values',
        'extensionElements',
        [ calledElement ],
        []
      ));
    }

    // update properties
    commands.push(cmdHelper.updateBusinessObject(element, calledElement, values));
    return commands;
  }


  // validation /////////////////////////////////////////////////////////////////

  group.entries.push({
    id: 'callActivity-errorMessage',
    html: `<div data-show="isInvalid">
             <span class="bpp-icon-warning"></span>
             ${escapeHTML(translate('Must either provide process id or process id expression'))}
          </div>`,

    isInvalid: function(element, node, notification) {

      const businessObject = getBusinessObject(element),
            calledElement = getCalledElement(businessObject);

      let isInvalid = true;
      if (calledElement) {
        const processId = getProperty(element, 'processId'),
              processIdExpression = getProperty(element, 'processIdExpression');

        isInvalid = !processId && !processIdExpression;
      }

      domClasses(node).toggle('bpp-hidden', !isInvalid);
      domClasses(notification).toggle('bpp-error-message', isInvalid);

      return isInvalid;
    }
  });


  // properties /////////////////////////////////////////////////////////////////

  group.entries.push(entryFactory.textField({
    id: 'process-id',
    label: translate('Process Id'),
    modelProperty: 'processId',

    get: function(element) {
      return {
        processId: getProperty(element, 'processId')
      };
    },

    set: function(element, values) {
      return setProperties(element, {
        processId: values.processId || undefined
      });
    }
  }));

  group.entries.push(entryFactory.textField({
    id: 'processIdExpression',
    label: translate('Process Id Expression'),
    modelProperty: 'processIdExpression',

    get: function(element) {
      return {
        processIdExpression: getProperty(element, 'processIdExpression')
      };
    },

    set: function(element, values) {
      return setProperties(element, {
        processIdExpression: values.processIdExpression || undefined
      });
    }
  }));
}

// helper //////////

function getCalledElement(bo) {
  const elements = getExtensionElements(bo, 'zeebe:CalledElement') || [];
  return elements[0];
}

function getExtensionElements(bo, type) {
  return extensionElementsHelper.getExtensionElements(bo, type);
}