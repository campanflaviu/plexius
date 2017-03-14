var setDefaultOptions = function(callback) {
    chrome.storage.sync.get(function(results) {
        callback(results);
    });
};

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
    chrome.runtime.sendMessage({ "type": "set", "key": key, "value": value });
};


var processPageDetails = function(metadata_xml) {
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
        // tv show
        if (mediaContainer.getElementsByTagName('Directory')[0].getAttribute('type') === 'show') {
            details.resourceTitle = mediaContainer.getElementsByTagName('Directory')[0].getAttribute('title');
            details.resourceYear = mediaContainer.getElementsByTagName('Directory')[0].getAttribute('year');
            details.resourceType = 'series';
        } else if (mediaContainer.getElementsByTagName('Directory')[0].getAttribute('type') === 'season') {
            return; // no imdb rating for seasons
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
};

var injectRating = function(ratingProvider) {
    // check if there is a container for reviews. If not, inject it
    if (!jQuery(titleCriticRatingContainerEl).length) {
        jQuery(titleRatingContainerEl).append('<span class="plexius-title-rating"><div class="plexius-rating-container"><div class="plexius-rating-rt"><div class="plexius-rating"></div></div><div></span>');
        criticRatingRtEl = '.plexius-rating';
    } else
    // check if there is a container for multiple reviews. If not, inject it
    if (!jQuery(criticRatingContainerEl).children(criticRatingRtEl).length) {
        jQuery(criticRatingContainerEl).children(0).wrap('<div class="plexius-rating"></div>');
        criticRatingRtEl = '.plexius-rating';
    }

    var el = jQuery(criticRatingRtEl);
    var newElement = '<a href="' + ratingProvider.linkUri + '" target="_blank"><div class="plexius-' + ratingProvider.name + '-rating-container"><img class="plexius-' + ratingProvider.name + '-rating" src="' + ratingProvider.imgSrc + '">' + ratingProvider.rating + '</a></div>';
    jQuery(criticRatingRtEl).append(newElement);
};


var getServerAddresses = function(requests_url, plex_token, callback) {
    if (global_server_addresses) {
        callback(global_server_addresses);
    } else {
        var xml_lookup_tag_name, request_path;
        // Lookups are different if we are going to plex.tv as opposed to a local IP address
        if (plex_token) {
            xml_lookup_tag_name = 'Device';
            request_path = '/resources?includeHttps=1';
        } else {
            xml_lookup_tag_name = 'Server';
            request_path = '/servers?includeLite=1';
        }
        getXML(requests_url + request_path + '&X-Plex-Token=' + plex_token, function(servers_xml) {
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
                        console.error('plexius', 'Failed to ping address for ' + machine_identifier + ' - ' + uri);
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
                    var uri = connection.hasAttribute('uri') ? connection.getAttribute('uri') : window.location.protocol + '//' + connection.getAttribute('address') + ':' + connection.getAttribute('port');
                    var local = !connection.hasAttribute('uri') || connection.getAttribute('local') == 1;
                    task_counter += 1;
                    pingAddress(machine_identifier, name, uri, access_token, local);
                }
            }
        });
    }
};
