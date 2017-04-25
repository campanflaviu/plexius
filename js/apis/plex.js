var plexApi = {

    getSeries: function(id, callback) {
        seriesXmlUrl = server.uri + '/library/metadata/' + id + '/children?X-Plex-Token=' + localStorage.myPlexAccessToken;

        getXML(seriesXmlUrl, function(seriesXml) {
            callback(seriesXml);
        });

    }
};