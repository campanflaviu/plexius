var getJSONWithCache = function(url, callback, custom_headers) {
    cache_get('cache-' + url, function(result) {
        if (result) {
            callback(result);
        } else {
            // cache missed or stale, grabbing new data
            getJSON(url, function(result) {
                cache_set('cache-' + url, result);
                callback(result);
            }, custom_headers);
        }
    });
};

var getJSON = function(url, callback, custom_headers) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    for (var header_name in custom_headers) {
        xhr.setRequestHeader(header_name, custom_headers[header_name]);
    }
    xhr.onload = function(e) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                callback(JSON.parse(xhr.responseText));
            } else {
                callback({ 'error': xhr.statusText });
            }
        }
    };
    xhr.onerror = function() {
        callback({ 'error': xhr.statusText });
    };
    xhr.send();
};

var getXML = function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function(e) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                callback(xhr.responseXML);
            } else {
                callback(xhr.statusText);
            }
        }
    };
    xhr.onerror = function() {
        callback(xhr.statusText);
    };
    xhr.send();
};

var getXMLWithTimeout = function(url, timeout, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function(e) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                callback(xhr.responseXML);
            } else {
                callback(xhr.statusText);
            }
        }
    };
    xhr.onerror = function() {
        callback(xhr.statusText);
    };
    xhr.timeout = timeout;
    xhr.ontimeout = function() {
        callback(xhr.statusText);
    };
    xhr.send();
};

var local_storage_set = function(key, value) {
    var hash = {};
    hash[key] = value;
    chrome.storage.local.set(hash);
};

var local_storage_get = function(key, callback) {
    chrome.storage.local.get(key, function(result) {
        var value = result[key];
        callback(value);
    });
};

var cache_set = function(key, data) {
    local_storage_get('cache_keys', function(cache_keys) {
        // check if cache keys don't exist yet
        if (!cache_keys) {
            cache_keys = {};
        }

        // store cached url keys with timestamps
        cache_keys[key] = { 'timestamp': new Date().getTime() };
        local_storage_set('cache_keys', cache_keys);

        // store cached data with url key
        local_storage_set(key, data);
    });
};

var cache_get = function(key, callback) {
    local_storage_get(key, function(result) {
        if (result) {
            callback(result);
        } else {
            callback(null);
        }
    });
};


var getResourcePath = function(resource) {
    return chrome.extension.getURL('assets/' + resource);
};

var background_storage_set = function(key, value) {
    chrome.runtime.sendMessage({"type": "set", "key": key, "value": value});
};
