```javascript
        document.querySelector("div[contenteditable]").addEventListener("paste", function(e) {
            e.preventDefault();

            var content;
            if (e.clipboardData) {
                //FF 22, Webkit, "standards"
                e.preventDefault();
                content = e.clipboardData.getData("text/plain");
                self.editorIframeDocument.execCommand("insertText", false, content);
            } else if (window.clipboardData) {
                //IE, "nasty"
                e.preventDefault();
                content = window.clipboardData.getData("Text");
                content = content.replace(/</g, '&lt;');
                content = content.replace(/>/g, '&gt;');
                content = content.replace(/\n/g, '<br>');
                content = content.replace(/\r/g, ''); // for ie
                content = content.replace(/<br>\s/g, '<br>&nbsp;');
                content = content.replace(/\s\s\s/g, '&nbsp; &nbsp;');
                content = content.replace(/\s\s/g, '&nbsp; ');

                if (document.selection) {
                    document.selection.createRange().pasteHTML(content);
                } else {
                    var rng = document.getSelection().getRangeAt(0);
                    rng.deleteContents();
                    var textNode = document.createTextNode(content);
                    rng.insertNode(textNode);
                }
            }
        });
```
