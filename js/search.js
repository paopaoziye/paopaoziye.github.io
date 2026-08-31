var searchFunc = function (path, search_id, content_id) {
    'use strict';

    var escapeRegExp = function (value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    var htmlToText = function (value) {
        var parsed = new DOMParser().parseFromString('<body>' + value + '</body>', 'text/html');
        return parsed.body ? parsed.body.textContent : value;
    };

    var appendHighlightedText = function (parent, text, keywords) {
        var pattern = keywords.map(escapeRegExp).join('|');
        if (!pattern) {
            parent.appendChild(document.createTextNode(text));
            return;
        }

        var matcher = new RegExp(pattern, 'gi');
        var lastIndex = 0;
        text.replace(matcher, function (match, offset) {
            parent.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
            var emphasis = document.createElement('em');
            emphasis.className = 'search-keyword';
            emphasis.textContent = match;
            parent.appendChild(emphasis);
            lastIndex = offset + match.length;
            return match;
        });
        parent.appendChild(document.createTextNode(text.slice(lastIndex)));
    };

    var input = document.getElementById(search_id);
    var resultContent = document.getElementById(content_id);
    if (!input || !resultContent) {
        return;
    }

    $.ajax({
        url: path,
        dataType: 'xml',
        success: function (xmlResponse) {
            var datas = $('entry', xmlResponse).map(function () {
                return {
                    title: $('title', this).text().trim(),
                    content: $('content', this).text(),
                    url: $('url', this).text().trim()
                };
            }).get();

            input.addEventListener('input', function () {
                var query = this.value.trim();
                resultContent.textContent = '';
                if (!query) {
                    return;
                }

                var keywords = query.toLocaleLowerCase().split(/[\s-]+/).filter(Boolean);
                var resultList = document.createElement('ul');
                resultList.className = 'search-result-list';

                datas.forEach(function (data) {
                    var title = data.title;
                    var content = htmlToText(data.content).trim();
                    var titleLower = title.toLocaleLowerCase();
                    var contentLower = content.toLocaleLowerCase();
                    if ((!title && !content) || !keywords.every(function (keyword) {
                        return titleLower.indexOf(keyword) >= 0 || contentLower.indexOf(keyword) >= 0;
                    })) {
                        return;
                    }

                    var dataUrl = data.url;
                    if (dataUrl && !/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(dataUrl)) {
                        dataUrl = '/' + dataUrl;
                    }
                    var resultItem = document.createElement('li');
                    var resultLink = document.createElement('a');
                    resultLink.href = dataUrl || '#';
                    resultLink.className = 'search-result-title';
                    resultLink.textContent = title;
                    resultItem.appendChild(resultLink);

                    var firstOccur = -1;
                    keywords.forEach(function (keyword) {
                        var index = contentLower.indexOf(keyword);
                        if (index >= 0 && (firstOccur < 0 || index < firstOccur)) {
                            firstOccur = index;
                        }
                    });
                    if (firstOccur >= 0) {
                        var start = Math.max(0, firstOccur - 20);
                        var end = Math.min(content.length, start + 100);
                        var resultExcerpt = document.createElement('p');
                        resultExcerpt.className = 'search-result';
                        appendHighlightedText(resultExcerpt, content.slice(start, end), keywords);
                        if (end < content.length) {
                            resultExcerpt.appendChild(document.createTextNode('...'));
                        }
                        resultItem.appendChild(resultExcerpt);
                    }
                    resultList.appendChild(resultItem);
                });
                resultContent.appendChild(resultList);
            });
        },
        error: function () {
            resultContent.textContent = '搜索数据加载失败，请稍后重试。';
        }
    });
};
