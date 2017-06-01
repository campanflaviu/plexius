var omdbApi = {

    linkUri: 'http://www.imdb.com/title/',

    searchByImdbId: function(query, callback) {
        var api_url = 'https://www.omdbapi.com/?apikey=' + constants.omdbApiKey + '&i=' + query;

        getJSONWithCache(api_url, function(omdb_json) {
            callback(omdb_json);
        });
    },

    searchByTitle: function(query, year, resourceType, season, episode, callback) {
        var api_url = 'https://www.omdbapi.com/?apikey=' + constants.omdbApiKey + '&t=' + encodeURIComponent(query) + '&type=' + resourceType;

        if (year) {
            api_url += '&y=' + year;
        }
        if (season) {
            api_url += '&season=' + season;
        }
        if (episode) {
            api_url += '&episode=' + episode;
        }

        getJSONWithCache(api_url, function(omdb_json) {
            callback(omdb_json);
        });
    },



    processImdbRating: function(movie_data) {

        // check if there is a container for reviews. If not, inject it
        if (!jQuery(titleCriticRatingContainerEl).length && !jQuery('.plexius-title-rating').length) {
            jQuery(titleRatingContainerEl).append('<span class="plexius-title-rating"><div class="plexius-rating-container"><div class="plexius-rating-rt"><div class="plexius-rating"></div></div></div></span>');
            criticRatingRtEl = '.plexius-rating';
        } else
        // check if there is a container for multiple reviews. If not, inject it
        if (!jQuery(criticRatingContainerEl).children(criticRatingRtEl).length) {
            jQuery(criticRatingContainerEl).children(0).wrap('<div class="plexius-rating"></div>');
            criticRatingRtEl = '.plexius-rating';
        }

        var el = jQuery(criticRatingRtEl);
        var newElement = '<a href="http://www.imdb.com/title/' + movie_data.imdbID + '" target="_blank"><div class="plexius-imdb-rating-container"><img class="plexius-imdb-rating" src="' + getResourcePath('imdb_logo.png') + '">' + movie_data.imdbRating + '</div></a>';
        jQuery(criticRatingRtEl).append(newElement);
    },

    processResource: function(movieDetails) {
        // no imdb rating for seasons
        if (movieDetails.resourceType === 'season') {
            return;
        }
        if (movieDetails.imdb_id) {
            omdbApi.searchByImdbId(movieDetails.imdb_id, function(resourceData) {
                omdbApi.processImdbRating(resourceData);
            });
        } else {
            if (movieDetails.resourceType === 'series') { // many series has a year attached to it, or a country code which messes up the search
                var matches = /\(([^)]+)\)/.exec(movieDetails.resourceTitle);
                if (matches && matches.length && /^\d+$/.test(matches[matches.length - 1])) {
                    movieDetails.resourceYear = matches[matches.length - 1];
                }
                movieDetails.resourceTitle = movieDetails.resourceTitle.replace(/ *\([^)]*\) */g, '').trim();
            }

            omdbApi.searchByTitle(movieDetails.resourceTitle, movieDetails.resourceYear, movieDetails.resourceType, movieDetails.season, movieDetails.episode, function(resourceData) {
                if (resourceData.Response !== 'False') {
                    injectRating({
                        name: 'imdb',
                        linkUri: omdbApi.linkUri + resourceData.imdbID,
                        imgSrc: getResourcePath('imdb_logo.png'),
                        rating: resourceData.imdbRating
                    });
                }
            });
        }
    }
};
