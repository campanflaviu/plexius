var global_server_addresses;
var server_addresses = {};
var criticRatingRtEl = "div[class^='CriticRating-rt'], div[class*=' CriticRating-rt']";
var titleRatingContainerEl = "div[class^='PrePlayRatingRightTitle-ratingRightTitle-'], div[class*=' PrePlayRatingRightTitle-ratingRightTitle-']";
var titleCriticRatingContainerEl = "span[class^='PrePlayRatingRightTitle-criticRating'], span[class*=' PrePlayRatingRightTitle-criticRating']";
var criticRatingContainerEl = "div[class^='CriticRating-container-'], div[class*=' CriticRating-container-']";
var imdbRatingContainerEl = "div[class^='CriticRating-imdb-'], div[class*=' CriticRating-imdb-']";
var task_counter = 0;
var xml_lookup_tag_name = 'Device';


var checkPage = function() {
    if (/\/details\?key=%2Flibrary%2Fmetadata%2F(\d+)$/.test(document.URL)) { // check if on movie/tv show page
        checkElement();
    }
};

window.onhashchange = function() {
    checkPage();
};


function checkElement() {
    jQuery(document).arrive(titleRatingContainerEl, function() {

        var requests_url;
        if (localStorage.myPlexAccessToken) {
            requests_url = 'https://plex.tv/pms';
        } else {
            var url_matches = page_url.match(/^https?\:\/\/(.+):(\d+)\/web\/.+/);
            requests_url = window.location.protocol + '//' + url_matches[1] + ':' + url_matches[2];
        }

        getServerAddresses(requests_url, localStorage.myPlexAccessToken, function(server_addresses) {

            // there is a built in imdb rating for a few movies
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

            var metadata_xml_url = global_server_addresses[machine_identifier].uri + '/library/metadata/' + parent_item_id + '?X-Plex-Token=' + localStorage.myPlexAccessToken;

            console.log('plexius', metadata_xml_url);
            getXML(metadata_xml_url, function(metadata_xml) {

                var mediaContainer = metadata_xml.getElementsByTagName('MediaContainer')[0];
                var agent;
                var resourceType;
                var resourceTitle = '';
                var resourceYear = '';
                var season;
                var episode;

                if (mediaContainer.getElementsByTagName('Video').length) {
                    if (mediaContainer.getElementsByTagName('Video')[0].getAttribute('type') === 'episode') {
                        // episode - disable this for the now, since omdb rating update time for some episodes is too high

                        // resourceType = 'episode';
                        // season = mediaContainer.getElementsByTagName('Video')[0].getAttribute('parentIndex');
                        // episode = mediaContainer.getElementsByTagName('Video')[0].getAttribute('index');
                        // resourceTitle = mediaContainer.getElementsByTagName('Video')[0].getAttribute('grandparentTitle');
                        return;
                    } else {
                        // movie
                        agent = mediaContainer.getElementsByTagName('Video')[0].getAttribute('guid');
                        resourceType = 'movie';
                    }
                } else if (mediaContainer.getElementsByTagName('Directory').length) {
                    // tv show
                    if (mediaContainer.getElementsByTagName('Directory')[0].getAttribute('type') === 'show') {
                        resourceTitle = mediaContainer.getElementsByTagName('Directory')[0].getAttribute('title');
                        resourceYear = mediaContainer.getElementsByTagName('Directory')[0].getAttribute('year');
                        resourceType = 'series';
                    } else if (mediaContainer.getElementsByTagName('Directory')[0].getAttribute('type') === 'season') {
                        return; // no imdb rating for seasons
                    }
                }

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
                    omdb_api.searchByImdbId(imdb_id, function(resourceData) {
                        processImdbRating(resourceData);
                    });
                } else {
                    if (resourceType === 'series' || resourceType === 'episode') { // many series has a year attached to it, or a country code which messes up the search
                        var matches = /\(([^)]+)\)/.exec(resourceTitle);
                        if (matches && matches.length && /^\d+$/.test(matches[matches.length - 1])) {
                            resourceYear = matches[matches.length - 1];
                        }
                        resourceTitle = resourceTitle.replace(/ *\([^)]*\) */g, '').trim();
                    }
                    omdb_api.searchByTitle(resourceTitle, resourceYear, resourceType, season, episode, function(resourceData) {
                        if (resourceData.Response !== 'False') {
                            processImdbRating(resourceData);
                        }
                    });
                }
            });
        });
        jQuery(document).unbindArrive();
    });
}

function processImdbRating(movie_data) {

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
    var newElement = '<a href="http://www.imdb.com/title/' + movie_data.imdbID + '" target="_blank"><div class="plexius-imdb-rating-container"><img class="plexius-imdb-rating" src="' + getResourcePath('imdb_logo.png') + '">' + movie_data.imdbRating + '</a></div>';
    jQuery(criticRatingRtEl).append(newElement);
}


// first run
checkPage();