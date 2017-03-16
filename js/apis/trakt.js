var traktApi = {

    api_key: constants.traktApiKey,
    customHeaders: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': constants.traktApiKey
    },
    apiUri: 'https://api.trakt.tv/',
    linkUri: 'http://trakt.tv/',

    parseTitle: function(title) {
        // remove spaces and replace them by dashes
        title = title.split(' ').join('-');

        // remove spaces and replace them by dashes and lowercase
        title = title.split('.').join('-').toLowerCase();

        return title;
    },

    getMovieRating: function(query, year, imdbId, callback) {
        var api_url;
        if (imdbId) {
            api_url = traktApi.apiUri + 'search/imdb/' + imdbId + '?extended=full';
        } else {
            query = query.split(' ').join('-').toLowerCase();
            api_url = traktApi.apiUri + 'search/movie?query=' + encodeURIComponent(query) + '&years=' + year + '&extended=full';
        }

        getJSONWithCache(api_url, function(trakt_json) {
            callback(trakt_json);
        }, traktApi.customHeaders);
    },

    getShowRating: function(query, year, callback) {
        query = query.split(' ').join('-').toLowerCase();
        var api_url = traktApi.apiUri + 'search/show?query=' + encodeURIComponent(traktApi.parseTitle(query)) + '&years=' + year + '&extended=full';

        getJSONWithCache(api_url, function(trakt_json) {
            callback(trakt_json);
        }, traktApi.customHeaders);
    },

    getSeasonRating: function(query, season_num, callback) {
        var api_url = traktApi.apiUri + 'shows/' + encodeURIComponent(query) + '/seasons/' + season_num + '/ratings';

        getJSONWithCache(api_url, function(trakt_json) {
            callback(trakt_json);
        }, traktApi.customHeaders);
    },

    getEpisodeRating: function(query, season_num, episode_num, callback) {
        var api_url = traktApi.apiUri + 'shows/' + encodeURIComponent(query) + '/seasons/' + season_num + '/episodes/' + episode_num + '/ratings';

        getJSONWithCache(api_url, function(trakt_json) {
            callback(trakt_json);
        }, traktApi.customHeaders);
    },

    injectYoutubeTrailer: function(trailerApi) {
        jQuery(headerToolbarContainerEl).prepend('<a href="' + trailerApi + '" target="_blank" aria-label="Trailer" title="Trailer"><button class="plexius-trailer-button Link-link-2wZEE Link-default-1sSkX tether-target tether-element-attached-top tether-element-attached-center tether-target-attached-bottom tether-target-attached-center" style="text-align: center" type="button"><i class="plex-icon-trailer" aria-hidden="true"></i></button></a>');
    },

    processResource: function(movieDetails) {
        var query, url;

        if (movieDetails.imdb_id) {
            query = movieDetails.imdb_id;
            url = movieDetails.imdb_id;
        } else {
            query = movieDetails.resourceTitle;
            url = movieDetails.resourceTitle.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
        }

        if (movieDetails.resourceType === 'movie') {
            traktApi.getMovieRating(query, movieDetails.resourceYear, movieDetails.imdb_id, function(trakt_json) {
                if (trakt_json.error) {
                    return;
                } else {
                    trakt_json = trakt_json[0].movie;
                    var rating = Math.round(trakt_json.rating * 10);

                    if (settings.showTrakt) {
                        injectRating({
                            name: 'trakt',
                            linkUri: traktApi.linkUri + 'movies/' + trakt_json.ids.slug,
                            imgSrc: getResourcePath('trakt_logo.png'),
                            rating: rating + '%'
                        });
                    }
                    if (settings.showTrailer && trakt_json.trailer) {
                        traktApi.injectYoutubeTrailer(trakt_json.trailer);
                    }
                }
            });
        } else if (movieDetails.resourceType === 'series') {
            traktApi.getShowRating(query, movieDetails.resourceYear, function(trakt_json) {
                if (trakt_json.error) {
                    return;
                }
                if (trakt_json[0]) {
                    trakt_json = trakt_json[0].show;
                }
                var rating = Math.round(trakt_json.rating * 10);
                injectRating({
                    name: 'trakt',
                    linkUri: traktApi.linkUri + 'shows/' +  trakt_json.ids.slug,
                    imgSrc: getResourcePath('trakt_logo.png'),
                    rating: rating + '%'
                });
            });
        }

    }
};
