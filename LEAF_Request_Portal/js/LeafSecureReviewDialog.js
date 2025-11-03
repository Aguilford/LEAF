var LeafSecureReviewDialog = function(domId) {
    var prefixID = 'LeafSecureReviewDialog' + Math.floor(Math.random()*1000) + '_';

    $('#' + domId).html('<div id="'+ prefixID +'sensitiveFields">Loading field list for review...</div>'
                + '<div id="'+ prefixID +'nonSensitiveFields"></div>');

    $.ajax({
        type: 'GET',
        url: 'api/form/indicator/list',
        cache: false
    })
    .then(function(res) {

        var sensitiveFields = [];
        var nonSensitiveFields = [];
        for(var i in res) {
            var temp = {};
            temp = res[i];
            temp.recordID = res[i].indicatorID;
            if(res[i].is_sensitive == '1') {
                sensitiveFields.push(temp);
            }
            else {
                if(temp.categoryID.indexOf('leaf_') == -1) {
                    nonSensitiveFields.push(temp);
                }
            }
        }

        if(sensitiveFields.length > 0) {
            buildSensitiveGrid(sensitiveFields);
        }
        else {
            $('#'+ prefixID +'sensitiveFields').html('<h2>No data fields have been marked as sensitive.</h2>');
            if($('#'+ prefixID).val() == '') {
                $('#'+ prefixID).val('N/A');
            }
        }

        if(nonSensitiveFields.length > 0) {
            buildNonSensitiveGrid(nonSensitiveFields);
        }
        else {
            $('#'+ prefixID +'nonSensitiveFields').html('');
        }
    });

    const renderChildren = (node = {}, flaggedFields = {}) => {
        let cbuffer = '';
        const child = node?.child ?? null;
        if (child !== null) {
            let nodes = [];
            for (let c in child) {  //make array to sort by sort order
                nodes.push(child[c]);
            }
            nodes.sort((a, b) => a.sort - b.sort);
            nodes.forEach(n => {
                const flaggedContent = flaggedFields[n.indicatorID] === 1 ?
                    `<span style="color:#b00;">&nbsp;<b>*sensitive</b></span>` : '';
                cbuffer += `<div style="padding: 0.25rem 0;">${n.name}${flaggedContent}</div>`;
                cbuffer += renderChildren(n, flaggedFields);
            });
        }
        return cbuffer;
    }
    const buildFormPreview = (name, formTree = [], flaggedFields = {}, modal = {}) => {
        let buffer = `<div style="font-size:14px;line-height:1.3;max-width:600px;">`;
        formTree.forEach((page, idx) => {
            const flaggedContent = flaggedFields[page.indicatorID] === 1 ?
                `<span style="color:#b00;">&nbsp;<b>*sensitive</b></span>` : '';
            buffer += `<div style="font-weight:bold;">Section ${idx + 1}<hr></div>
                <div>${page.name}${flaggedContent}</div>`;
            buffer += renderChildren(page, flaggedFields);
            buffer += '<br><br>';
        });
        buffer += "</div>";
        modal?.setTitle(name);
        modal?.setContent(buffer);
        modal?.setSaveHandler(() => {
            modal?.clearDialog();
            modal?.hide();
        });
        modal?.show();
    }
    const makeScopedPreviewFormListener = (id, name, flaggedFields) => () => {
        fetch(`./api/form/category?id=${id}`)
        .then(res => res.json())
        .then(data => {
            if(typeof dialog_message !== 'undefined') {
                buildFormPreview(name, data, flaggedFields, dialog_message);
            }
        }).catch(err => console.log(err));
    }
    function buildSensitiveGrid(sensitiveFields) {
        let flaggedFields = {};
        sensitiveFields.forEach(f => flaggedFields[f.indicatorID] = 1);
        let gridSensitive = new LeafFormGrid(prefixID +'sensitiveFields');
        gridSensitive.hideIndex();
        gridSensitive.setData(sensitiveFields);
        gridSensitive.setDataBlob(sensitiveFields);
        gridSensitive.setHeaders([
        {name: 'Form', indicatorID: 'formName', editable: false, callback: function(data, blob) {
            const formConfig = gridSensitive.getDataByIndex(data.index);
            const formName = formConfig.categoryName;

            let content = formName;
            if (domId === 'leafSecureDialogContentPrint') {
                const formID = formConfig.categoryID;
                const listener = makeScopedPreviewFormListener(formID, formName, flaggedFields);
                const styles = `style="display:flex;gap:1rem;justify-content:space-between;"`;
                const btnID = `print_${formID}_${data.index}`;
                content = `<div ${styles}>
                    ${formName}
                    <button id="${btnID}" type="button" class="buttonNorm">Preview Form</button>
                </div>`;
                $('#'+data.cellContainerID).html(content);
                document.getElementById(btnID)?.addEventListener('click', listener);
            } else {
                $('#'+data.cellContainerID).html(content);
            }
        }},
        {name: 'Field Name', indicatorID: 'fieldName', editable: false, callback: function(data, blob) {
            $('#'+data.cellContainerID).html(gridSensitive.getDataByIndex(data.index).name);
            $('#'+data.cellContainerID).css('font-size', '14px');
        }}
        ]);
        gridSensitive.sort('fieldName', 'desc');
        gridSensitive.renderBody();
        $('#'+ prefixID +'sensitiveFields').prepend('<h2>The following fields have been marked as sensitive.</h2>'
                                                + '<p>Sensitive fields automatically enable and enforce "Need to know" data restrictions in this system.</p>');
    }

    function buildNonSensitiveGrid(nonSensitiveFields) {
        var gridNonSensitive = new LeafFormGrid(prefixID + 'nonSensitiveFields');
        gridNonSensitive.hideIndex();
        gridNonSensitive.setData(nonSensitiveFields);
        gridNonSensitive.setDataBlob(nonSensitiveFields);
        gridNonSensitive.setHeaders([
        {name: 'Form', indicatorID: 'formName', editable: false, callback: function(data, blob) {
            $('#'+data.cellContainerID).html(gridNonSensitive.getDataByIndex(data.index).categoryName);
        }},
        {name: 'Field Name', indicatorID: 'fieldName', editable: false, callback: function(data, blob) {
            $('#'+data.cellContainerID).html(gridNonSensitive.getDataByIndex(data.index).name);
            $('#'+data.cellContainerID).css('font-size', '14px');
        }}
        ]);
        gridNonSensitive.sort('fieldName', 'desc');
        gridNonSensitive.renderBody();
        $('#'+ prefixID +'nonSensitiveFields').prepend('<br /><h2 style="color:#c00;">Please verify the remaining fields are not sensitive.</h2>');
    }
};
