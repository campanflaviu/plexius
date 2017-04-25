var missingEpisodes = {

    init: function(server, resource) {
        missingEpisodes.server = server;

        missingEpisodes.injectPopup();

        if (resource.resourceType === 'season') {
            missingEpisodes.processEpisodes(resource);
        }
    },

    processEpisodes: function(resource) {

        // store current page hash so plugin doesn't insert tiles if page changed
        var currentHash = location.hash;


        missingEpisodes.getPresentEpisodes(resource.seasonMetadataId, function(presentEpisodes) {
            plexApi.getSeries(resource.seriesMetadataId, function(seriesXml) {
                var seriesYear = seriesXml.getElementsByTagName('MediaContainer')[0].getAttribute('parentYear');
                traktApi.getShowByName(resource.title, seriesYear, false, function(traktSeries) {
                    if (traktSeries[0] && traktSeries[0].show) {
                        traktApi.getAllEpisodesBySlug(traktSeries[0].show.ids.slug, resource.seasonIndex, function(allEpisodes) {
                            var tilesToInsert = {};
                            var missing = [];
                            for (var i = 0; i < allEpisodes.length; i++) {
                                var episode = allEpisodes[i];
                                if (presentEpisodes.indexOf(episode.number) === -1) {
                                    missing.push(episode);
                                }
                            }

                            var parsedMissingEpisodes = missingEpisodes.splitEpisodes(missing);

                            if (currentHash === location.hash) {
                                missingEpisodes.injectData(traktSeries[0].show.ids.slug, parsedMissingEpisodes);
                            }
                        });
                    }
                });
            });
        });
    },

    getPresentEpisodes: function(seasonMetadataId, callback) {
        var episodesMetadataXmlUrl = missingEpisodes.server.uri + '/library/metadata/' + seasonMetadataId + '/children?X-Plex-Token=' + localStorage.myPlexAccessToken;

        getXML(episodesMetadataXmlUrl, function(episodesMetadataXml) {
            var episodesXml = episodesMetadataXml.getElementsByTagName('MediaContainer')[0].getElementsByTagName('Video');
            var episodes = [];
            for (var i = 0; i < episodesXml.length; i++) {
                episodes.push(parseInt(episodesXml[i].getAttribute('index')));
            }
            callback(episodes);
        });
    },

    injectData: function(showName, episodes) {
        if (episodes.aired.length) {
            jQuery('<span> - <span class="plex-missing-episodes">' + episodes.aired.length + ' missing</span></span>').appendTo("div[class^='HubCellTitle-hubCellTitle-'], div[class*='HubCellTitle-hubCellTitle-']");
        }
        if (episodes.unaired.length) {
            jQuery('<span> - <span class="plex-unaired-episodes">' + episodes.unaired.length + ' unaired</span></span>').appendTo("div[class^='HubCellTitle-hubCellTitle-'], div[class*='HubCellTitle-hubCellTitle-']");
        }

        jQuery('.plex-missing-episodes').click(function() {
            missingEpisodes.populateModal(showName, episodes.aired, 'Missing');
            openModal();
        });

        jQuery('.plex-unaired-episodes').click(function() {
            missingEpisodes.populateModal(showName, episodes.unaired, 'Unaired');
            openModal();
        });
    },

    injectPopup: function() {
        jQuery('html').append('<div id="missingEpisodes" class="modal-content plexius-content"><div class="modal-header"><h4 class="title"></h4><button type="button" class="close close-missing-episodes" data-dismiss="modal"><i class="glyphicon remove-2"></i></button></div><div class="modal-body dark-scrollbar"></div></div>');
        jQuery('.close-missing-episodes').click(function() {
            closeModal();
        });
    },

    splitEpisodes: function(episodes) {
        var aired = [], unaired = [];
        var now = new Date();

        jQuery.each(episodes, function(key, episode) {
            var episodeDate;

            if (episode.first_aired !== null) {
                episodeDate = new Date(episode.first_aired);
            }

            if (episodeDate <= now && episodeDate) {
                aired.push(episode);
            } else {
                unaired.push(episode);
            }
        });

        return {
            aired: aired,
            unaired: unaired
        };
    },

    populateModal: function(showName, episodes, type) {
        jQuery('#missingEpisodes .modal-body').empty();
        jQuery.each(episodes, function(key, episode) {
            var episodeTitle = '-';
            var formattedDate = '-';

            if (episode.title !== null) {
                episodeTitle = episode.title;
            }

            if (episode.first_aired !== null) {
                formattedDate = new Date(episode.first_aired).toDateString();
            }

            jQuery('#missingEpisodes .title').text(episodes.length + ' ' + type + ' Episodes');

            jQuery('#missingEpisodes .modal-body').append('<a target="_blank" href="https://trakt.tv/shows/' + showName + '/seasons/' + episode.season + '/episodes/'+ episode.number + '"><div class="missing-tile"><div class="missing-aired">' + formattedDate + '</div></div><div class="missing-title">' + episodeTitle + '</div><div class="missing-number">Episode ' + episode.number +'</div></a>');
        });
    }

};
var openModal = function() {
    jQuery('#missingEpisodes').show();
};

var closeModal = function() {
    jQuery('#missingEpisodes').hide();
};