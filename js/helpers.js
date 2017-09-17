var manifest = chrome.runtime.getManifest();

 // custom debugger
 // TODO create an option to disable debugging and then add meaningful debug logs
var debug = console.log.bind(console, 'Plexius ' + manifest.version);




function getDefaultOptions(callback) {
    chrome.storage.sync.get(function(results) {
        callback(results);
    });
}

function getJSONWithCache(url, callback, custom_headers) {
    cache_get('cache-' + url, function(result) {
        if (result) {
            callback(result);
        } else {
            debug('no cache found');
            // cache missed or stale, grabbing new data
            getJSON(url, function(result) {
                cache_set('cache-' + url, result);
                callback(result);
            }, custom_headers);
        }
    });
}

function getJSON(url, callback, custom_headers) {
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
}

function getXML(url, callback) {
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
}

function getXMLWithTimeout(url, timeout, callback) {
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
}

function local_storage_set(key, value) {
    var hash = {};
    hash[key] = value;
    chrome.storage.local.set(hash);
}

function local_storage_get(key, callback) {
    chrome.storage.local.get(key, function(result) {
        var value = result[key];
        callback(value);
    });
}

function cache_set(key, data) {
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
}

function cache_get(key, callback) {
    local_storage_get(key, function(result) {
        if (result) {
            callback(result);
        } else {
            callback(null);
        }
    });
}

function getResourcePath(resource) {
    return chrome.extension.getURL('assets/' + resource);
}

function background_storage_set(key, value) {
    chrome.runtime.sendMessage({ "type": "set", "key": key, "value": value });
}

function processPageDetails(metadata_xml) {
    var mediaContainer = metadata_xml.getElementsByTagName('MediaContainer')[0];
    var agent;
    var details = {};

    if (mediaContainer.getElementsByTagName('Video').length) {
        if (mediaContainer.getElementsByTagName('Video')[0].getAttribute('type') === 'episode') {
            return;
        } else {
            // movie
            details.resourceTitle = mediaContainer.getElementsByTagName('Video')[0].getAttribute('title');
            details.resourceYear = mediaContainer.getElementsByTagName('Video')[0].getAttribute('year');
            agent = mediaContainer.getElementsByTagName('Video')[0].getAttribute('guid');
            details.resourceType = 'movie';
        }
    } else if (mediaContainer.getElementsByTagName('Directory').length) {
        var directoryMetadata = mediaContainer.getElementsByTagName('Directory')[0];
        // tv show
        if (directoryMetadata.getAttribute('type') === 'show') {
            details.resourceTitle = directoryMetadata.getAttribute('title');
            details.resourceYear = directoryMetadata.getAttribute('year');
            details.seriesMetadataId = directoryMetadata.getAttribute('ratingKey');
            details.guid = directoryMetadata.getAttribute('guid');
            details.resourceType = 'series';
        } else if (directoryMetadata.getAttribute('type') === 'season') {
            details.title = directoryMetadata.getAttribute('parentTitle');
            details.seasonIndex = directoryMetadata.getAttribute('index');
            details.seasonMetadataId = directoryMetadata.getAttribute('ratingKey');
            details.seriesMetadataId = directoryMetadata.getAttribute('parentRatingKey');
            details.agent = directoryMetadata.getAttribute('guid');
            details.resourceType = 'season';
        }
    }

    // freebase metadata agent
    if (/com\.plexapp\.agents\.imdb/.test(agent)) {
        details.imdb_id = agent.match(/^com\.plexapp\.agents\.imdb:\/\/(.+)\?/)[1];
    }
    // check if using the XBMCnfoMoviesImporter agent
    else if (/com\.plexapp\.agents\.xbmcnfo/.test(agent)) {
        details.imdb_id = agent.match(/^com\.plexapp\.agents\.xbmcnfo:\/\/(.+)\?/)[1];
    }
    return details;
}

function injectRating(ratingProvider) {
    // check if there is a container for reviews. If not, inject it
    if (!jQuery(titleCriticRatingContainerEl).length && !jQuery('.plexius-title-rating').length) {
        jQuery(titleRatingContainerEl).append(createEl({
            type: 'span',
            class: 'plexius-title-rating',
            children: [{
                type: 'div',
                class: 'plexius-rating-container',
                children: [{
                    type: 'div',
                    class: 'plexius-rating-rt',
                    children: [{
                        type: 'div',
                        class: 'plexius-rating'
                    }]
                }]
            }]
        }));
        criticRatingRtEl = '.plexius-rating';
    } else
        // check if there is a container for multiple reviews. If not, inject it
        if (!jQuery(criticRatingContainerEl).children(criticRatingRtEl).length) {
            criticRatingRtEl = '.plexius-rating';
            jQuery(criticRatingContainerEl).children(0).wrap(createEl({
                type: 'div',
                class: 'plexius-rating'
            }));
        }

    // inject the rating
    var ratingClass = 'plexius-' + ratingProvider.name + '-rating-container';
    if (!jQuery(ratingClass).length) { // skip if already injected
        jQuery(criticRatingRtEl).append(createEl({
            type: 'a',
            attrs: {
                href: ratingProvider.linkUri,
                target: '_blank'
            },
            children: [{
                type: 'div',
                class: ratingClass,
                children: [{
                    type: 'img',
                    class: 'plexius-' + ratingProvider.name + '-rating',
                    attrs: {
                        src: ratingProvider.imgSrc,
                    }
                },
                ratingProvider.rating]
            }]

        }));
    }
}

function getServerAddresses(plex_token, callback) {
    if (global_server_addresses) {
        callback(global_server_addresses);
    } else {
        var xml_lookup_tag_name, requestPath;
        // Lookups are different if we are going to plex.tv as opposed to a local IP address
        if (plex_token) {
            xml_lookup_tag_name = 'Device';
            requestPath = '/resources?includeHttps=1';
        } else {
            xml_lookup_tag_name = 'Server';
            requestPath = '/servers?includeLite=1';
        }
        var reqestsUrl = getRequestsUrl();
        getXML(reqestsUrl + requestPath + '&X-Plex-Token=' + plex_token, function(servers_xml) {
            var devices = servers_xml.getElementsByTagName('MediaContainer')[0].getElementsByTagName(xml_lookup_tag_name);
            var task_counter = 0;

            var task_completed = function() {
                var machine_identifier;
                task_counter--;

                // Check if all async tasks are finished
                if (task_counter === 0) {
                    // Remove offline servers, which return a blank address from plex.tv
                    for (machine_identifier in server_addresses) {
                        if (server_addresses[machine_identifier].uri === '') {
                            delete server_addresses[machine_identifier];
                        }
                    }

                    // Pass server addresses to background for stats page
                    background_storage_set('server_addresses', server_addresses);

                    // Set global_server_addresses so results are cached
                    global_server_addresses = server_addresses;
                    debug('servers found: ', server_addresses);
                    callback(server_addresses);
                }
            };

            var pingAddress = function(machine_identifier, name, uri, access_token, local) {
                getXMLWithTimeout(uri + '?X-Plex-Token=' + access_token, 2000, function(server_xml) {
                    // Use address if we can reach it
                    if (server_xml && server_xml != 'Unauthorized' && server_xml.getElementsByTagName('MediaContainer')[0].getAttribute('machineIdentifier') === machine_identifier) {

                        if (server_addresses[machine_identifier] && local) {
                            // Local devices should override any remote
                            server_addresses[machine_identifier].uri = uri;
                        } else if (!server_addresses[machine_identifier]) {
                            // We found our first match!
                            server_addresses[machine_identifier] = {
                                'name': name,
                                'machine_identifier': machine_identifier,
                                'access_token': access_token,
                                'uri': uri
                            };
                        }
                    } else {
                        debug('Failed to ping address for ' + machine_identifier + ' - ' + uri);
                    }
                    task_completed();
                });
            };

            var server_addresses = {};
            for (var i = 0; i < devices.length; i++) {
                var device = devices[i];
                var connections = device.hasAttribute('address') ? [device] : device.getElementsByTagName('Connection');
                var name = device.getAttribute('name');
                var machine_identifier = device.hasAttribute('machineIdentifier') ? device.getAttribute('machineIdentifier') : device.getAttribute('clientIdentifier');
                var access_token = device.getAttribute('accessToken');
                for (var j = 0; j < connections.length; j++) {
                    var connection = connections[j];
                    var uri = getConnectionUri(connection);
                    var local = !connection.hasAttribute('uri') || connection.getAttribute('local') == 1;
                    task_counter += 1;
                    pingAddress(machine_identifier, name, uri, access_token, local);
                }
            }
        });
    }
}

function elementsStartingWithClass() {
    return elementsStartingWithClassArray.apply(this, arguments).join();
}

function elementsStartingWithClassArray() {
    var elements = [];
    for (var i = 0; i < arguments.length; i++) {
        elements.push('[class^="' + arguments[i] +'"]');
        elements.push('[class*=" ' + arguments[i] +'"]'); // add wildcard https://stackoverflow.com/a/13352103/951052
    }
    return elements;
}

function elementsStartingWithClassAndSuffix(classes, suffix) {
    var elements = elementsStartingWithClassArray.apply(this, classes);
    for (var i = 0; i < elements.length; i++) {
        elements[i] += suffix;
    }
    return elements.join();
}


function createEl(elementTree) {
    var element, childElement, i;

    if (typeof elementTree === 'undefined') {
        return false;
    }

    if (typeof elementTree === 'string') {
        return document.createTextNode(elementTree);
    }

    element = document.createElement(elementTree.type);
    if (elementTree.class) {
        element.className = elementTree.class;
    }
    if (elementTree.attrs) {
        for(var attr in elementTree.attrs) {
            element.setAttribute(attr, elementTree.attrs[attr]);
        }
    }
    if (elementTree.children) {
        for (i = 0; i < elementTree.children.length; i++) {
            childElement = createEl(elementTree.children[i]);
            if (childElement !== false) {
                element.appendChild(childElement);
            }
        }
    }
    return element;
}


function getStatsURL() {
    return chrome.extension.getURL('stats.html');
}

function cleanText(text) {
    text = text.replace(/[ÀÁÂÃÄÅ]/g, 'A');
    text = text.replace(/[àáâãäå]/g, 'a');
    text = text.replace(/[ÈÉÊË]/g, 'E');
    text = text.replace(/[é]/g, 'e');

    return encodeURIComponent(text);
}

function getRequestsUrl() {
    if (localStorage.myPlexAccessToken) {
        return 'https://plex.tv/pms';
    } else {
        var url_matches = document.URL.match(/^?\:\/\/(.+):(\d+)\/web\/.+/);
        return window.location.protocol + '//' + url_matches[1] + ':' + url_matches[2];
    }
}

function getConnectionUri(connection) {
    if (connection.hasAttribute('uri')) {
        return connection.getAttribute('uri');
    } else {
        return window.location.protocol + '//' + connection.getAttribute('address') + ':' + connection.getAttribute('port');
    }
}