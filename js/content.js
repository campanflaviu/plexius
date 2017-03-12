var servers = {};
var criticRatingRtEl = "div[class^='CriticRating-rt'], div[class*=' CriticRating-rt']";
var criticRatingContainerEl = "div[class^='CriticRating-container-'], div[class*=' CriticRating-container-']";
var imdbRatingContainerEl = "div[class^='CriticRating-imdb-'], div[class*=' CriticRating-imdb-']";

// first run
if (/\/details\?key=%2Flibrary%2Fmetadata%2F(\d+)$/.test(document.URL)) { // check if on movie/tv show page
    checkElement();
}

window.onhashchange = function() {
    checkElement();
};

function checkElement() {
    jQuery(document).arrive(criticRatingContainerEl, function() {
        var criticRatingContainer = jQuery(criticRatingContainerEl);

        if (jQuery(imdbRatingContainerEl).length) {
            return;
        }

        var parent_item_id;
        var page_identifier = document.URL.match(/\/server\/(.[^\/]+)\/details\?key=%2Flibrary%2Fmetadata%2F(\d+)$/);
        if (page_identifier) {
            parent_item_id = page_identifier[2];
        } else {
            return;
        }

        // check if there is a container for multiple reviews. If not, inject it
        if (!criticRatingContainer.children(criticRatingRtEl).length) {
            if (localStorage.plexiusRatingClass) {
                jQuery(criticRatingContainerEl).children(0).wrap('<div class="' + localStorage.plexiusRatingClass + '"></div>');
                console.log('plexius', localStorage.plexiusRatingClass);

            }
            console.log('plexius', 'NOT found!');
        } else if (!localStorage.plexiusRatingClass) {
            // save class value to local storage if it's not already
            localStorage.setItem('plexiusRatingClass', criticRatingContainer.children(criticRatingRtEl).attr('class'));
        }

        if (localStorage.users) {
            var users = JSON.parse(localStorage.users);
            servers = users.users[0].servers[0].connections;
        }

        var metadata_xml_url = servers[servers.length - 1].uri + "/library/metadata/" + parent_item_id + "?X-Plex-Token=" + localStorage.myPlexAccessToken;
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

        jQuery(document).unbindArrive();
    });
}

function processImdbRating(movie_data) {
    var el = jQuery(criticRatingRtEl);
    var elClass = jQuery(criticRatingRtEl).children(0).attr('class');
    var newElement = '<a href="http://www.imdb.com/title/' + movie_data.imdbID + '" target="_blank"><div class="' + elClass + '"><img class="imdb-rating" src="' + getResourcePath('imdb_logo.png') + '">' + movie_data.imdbRating + '</a></div>';
    jQuery(criticRatingRtEl).prepend(newElement);
}
