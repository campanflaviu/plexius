var global_server_addresses;
var server_addresses = {};
var criticRatingRtEl = "div[class^='CriticRating-rt'], div[class*=' CriticRating-rt']";
var criticRatingContainerEl = "div[class^='CriticRating-container-'], div[class*=' CriticRating-container-']";
var imdbRatingContainerEl = "div[class^='CriticRating-imdb-'], div[class*=' CriticRating-imdb-']";
var task_counter = 0;
var xml_lookup_tag_name = 'Device';


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
                            server_addresses[machine_identifier]['uri'] = uri;
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



window.onhashchange = function() {
    checkElement();
};

// first run
if (/\/details\?key=%2Flibrary%2Fmetadata%2F(\d+)$/.test(document.URL)) { // check if on movie/tv show page
    checkElement();
}

function checkElement() {
    jQuery(document).arrive(criticRatingContainerEl, function() {

        var requests_url;
        if (localStorage.myPlexAccessToken) {
            requests_url = 'https://plex.tv/pms';
        } else {
            var url_matches = page_url.match(/^https?\:\/\/(.+):(\d+)\/web\/.+/);
            requests_url = window.location.protocol + '//' + url_matches[1] + ':' + url_matches[2];
        }

        getServerAddresses(requests_url, localStorage.myPlexAccessToken, function(server_addresses) {
            var criticRatingContainer = jQuery(criticRatingContainerEl);

            if (jQuery(imdbRatingContainerEl).length) {
                return;
            }

            var parent_item_id, machine_identifier;
            var page_identifier = document.URL.match(/\/server\/(.[^\/]+)\/details\?key=%2Flibrary%2Fmetadata%2F(\d+)$/);
            if (page_identifier) {
                machine_identifier = page_identifier[1];
                parent_item_id = page_identifier[2];
            } else {
                return;
            }


            if (localStorage.users) {
                var users = JSON.parse(localStorage.users);
                servers = users.users[0].servers[0].connections;
            }

            var metadata_xml_url = global_server_addresses[machine_identifier].uri + "/library/metadata/" + parent_item_id + "?X-Plex-Token=" + localStorage.myPlexAccessToken;

            console.log('plexius', metadata_xml_url);
            getXML(metadata_xml_url, function(metadata_xml) {

                var agent = metadata_xml.getElementsByTagName('MediaContainer')[0].getElementsByTagName('Video')[0].getAttribute('guid');

                var imdb_id;

                // freebase metadata agent
                if (/com\.plexapp\.agents\.imdb/.test(agent)) {
                    imdb_id = agent.match(/^com\.plexapp\.agents\.imdb:\/\/(.+)\?/)[1];
                }
                // check if using the XBMCnfoMoviesImporter agent
                else if (/com\.plexapp\.agents\.xbmcnfo/.test(agent)) {
                    imdb_id = agent.match(/^com\.plexapp\.agents\.xbmcnfo:\/\/(.+)\?/)[1];
                }

                if (imdb_id) {
                    omdb_api.searchByImdbId(imdb_id, function(movie_data) {
                        processImdbRating(movie_data);
                    });
                } else {
                    omdb_api.searchByMovieTitle(movie_title, movie_year, function(movie_data) {
                        processImdbRating(movie_data);
                    });
                }
            });
        });
        jQuery(document).unbindArrive();
    });
}

function processImdbRating(movie_data) {

    var ratingContainer = criticRatingRtEl;
    // check if there is a container for multiple reviews. If not, inject it
    if (!jQuery(criticRatingContainerEl).children(ratingContainer).length) {
        jQuery(criticRatingContainerEl).children(0).wrap('<div class="plexius-rating"></div>');
        ratingContainer = '.plexius-rating';
    }

    var el = jQuery(ratingContainer);
    var elClass = jQuery(ratingContainer).children(0).attr('class');
    var newElement = '<a href="http://www.imdb.com/title/' + movie_data.imdbID + '" target="_blank"><div class="plexius-imdb-rating-container ' + elClass + '"><img class="plexius-imdb-rating" src="' + getResourcePath('imdb_logo.png') + '">' + movie_data.imdbRating + '</a></div>';
    jQuery(ratingContainer).append(newElement);
}
