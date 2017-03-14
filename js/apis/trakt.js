traktApi = {
    api_key: constants.traktApiKey,
    customHeaders: {
      'Content-Type' : 'application/json',
      'trakt-api-version' : '2',
      'trakt-api-key' : traktApiKey
    },
    uri: 'https://api.trakt.tv/',

    getMovieRating: function(query, callback) {
        var api_url = traktApi + 'movies/' + encodeURIComponent(query) + '/ratings';

        utils.getJSONWithCache(api_url, function(trakt_json) {
            callback(trakt_json);
        }, traktApi.customHeaders);
    },

    getShowRating: function(query, callback) {
        var api_url = traktApi + 'shows/' + encodeURIComponent(query) + '/ratings';

        utils.getJSONWithCache(api_url, function(trakt_json) {
            callback(trakt_json);
        }, traktApi.customHeaders);
    },

    getSeasonRating: function(query, season_num, callback) {
        var api_url = traktApi + 'shows/' + encodeURIComponent(query) + '/seasons/' + season_num + '/ratings';

        utils.getJSONWithCache(api_url, function(trakt_json) {
            callback(trakt_json);
        }, traktApi.customHeaders);
    },

    getEpisodeRating: function(query, season_num, episode_num, callback) {
        var api_url = traktApi + 'shows/' + encodeURIComponent(query) + '/seasons/' + season_num + '/episodes/' + episode_num + '/ratings';

        utils.getJSONWithCache(api_url, function(trakt_json) {
            callback(trakt_json);
        }, traktApi.customHeaders);
    }
};