var missingEpisodes = {

    init: function(server, resource) {
        if (!settings.showMissing) {
            return;
        }

        missingEpisodes.server = server;
        missingEpisodes.injectPopup();

        if (resource.resourceType === 'season') {
            missingEpisodes.processEpisodes(resource);
        } else if (resource.resourceType === 'series') {
            missingEpisodes.processSeasons(resource);
        }
    },

    processEpisodes: function(resource) {

        missingEpisodes.getPresentEpisodes(resource.seasonMetadataId, function(presentEpisodes) {
            console.log('plexius present episodes', presentEpisodes);
            plexApi.getSeries(resource.seriesMetadataId, function(seriesXml) {

                var seriesYear = seriesXml.getElementsByTagName('MediaContainer')[0].getAttribute('parentYear');
                traktApi.getShowByName(resource.title, seriesYear, false, function(traktSeries) {

                    console.log('plexius traktSeries', traktSeries);
                    if (traktSeries[0] && traktSeries[0].show) {
                        traktApi.getAllEpisodesBySlug(traktSeries[0].show.ids.slug, resource.seasonIndex, function(allEpisodes) {

                            console.log('plexius allEpisodes', allEpisodes);
                            var tilesToInsert = {};
                            var missing = [];
                            for (var i = 0; i < allEpisodes.length; i++) {
                                var episode = allEpisodes[i];
                                if (presentEpisodes.indexOf(episode.number) === -1) {
                                    missing.push(episode);
                                }
                            }
                            console.log('plexius missing', missing);

                            var parsedMissingEpisodes = missingEpisodes.splitEpisodes(missing);
                            missingEpisodes.injectData(traktSeries[0].show.ids.slug, parsedMissingEpisodes, 'episodes');
                        });
                    }
                });
            });
        });
    },

    processSeasons: function(resource) {
        console.log('plexius resource', resource);
        missingEpisodes.getPresentSeasons(resource.seriesMetadataId, function(presentSeasons) {

            console.log('plexius present seasons', presentSeasons);
            traktApi.getShowByName(resource.resourceTitle, resource.resourceYear, false, function(traktSeries) {

                console.log('plexius traktSeries', traktSeries);
                traktApi.getAllSeasonBySlug(traktSeries[0].show.ids.slug, function(allSeasons) {

                    console.log('plexius allSeasons', allSeasons);
                    var tilesToInsert = {};
                    var missing = [];
                    for (var i = 0; i < allSeasons.length; i++) {
                        var season = allSeasons[i];
                        if (presentSeasons.indexOf(season.number) === -1 &&
                            !(season.title === 'Specials' && !settings.showMissingSpecials)) {
                            missing.push(season);
                        }
                    }
                    console.log('plexius missing', missing);

                    var parsedMissingSeasons = missingEpisodes.splitEpisodes(missing);
                    missingEpisodes.injectData(traktSeries[0].show.ids.slug, parsedMissingSeasons, 'seasons');
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

    getPresentSeasons: function(seriesMetadataId, callback) {
        var seasonsMetadataXmlUrl = missingEpisodes.server.uri + '/library/metadata/' + seriesMetadataId + '/children?X-Plex-Token=' + localStorage.myPlexAccessToken;

        getXML(seasonsMetadataXmlUrl, function(seasonsMetadataXml) {
            var seasonsXml = seasonsMetadataXml.getElementsByTagName('MediaContainer')[0].getElementsByTagName('Directory');
            var seasons = [];
            for (var i = 0; i < seasonsXml.length; i++) {
                var seasonIndex = parseInt(seasonsXml[i].getAttribute("index"));
                if (!isNaN(seasonIndex)) {
                    seasons.push(seasonIndex);
                }
            }
            callback(seasons);
        });
    },

    injectData: function(showName, episodes, resourceType) {
        if (episodes.aired.length) {
            if (!jQuery('.plex-missing-episodes').length) {
                jQuery('<span class="plex-missing-episodes"> - <span>' + episodes.aired.length + ' missing</span></span>').appendTo("div[class^='PrePlayDescendantList-descendantHubCellHeader'] > div, div[class*='PrePlayDescendantList-descendantHubCellHeader'] > div, div[class^='_2qK3U'] > div, div[class*='_2qK3U'] > div");
            }
        }
        if (episodes.unaired.length) {
            if (!jQuery('.plex-unaired-episodes').length) {
                jQuery('<span class="plex-unaired-episodes"> - <span>' + episodes.unaired.length + ' unaired</span></span>').appendTo("div[class^='PrePlayDescendantList-descendantHubCellHeader'] > div, div[class*='PrePlayDescendantList-descendantHubCellHeader'] > div, div[class^='_2qK3U'] > div, div[class*='_2qK3U'] > div");
            }
        }

        jQuery('.plex-missing-episodes span').click(function() {
            missingEpisodes.populateModal(showName, episodes.aired, 'Missing', resourceType);
            openModal();
        });

        jQuery('.plex-unaired-episodes span').click(function() {
            missingEpisodes.populateModal(showName, episodes.unaired, 'Unaired', resourceType);
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

    populateModal: function(showName, resources, type, resourceType) {
        jQuery('#missingEpisodes .modal-body').empty();
        jQuery.each(resources, function(key, resource) {
            var resourceTitle = '-';
            var formattedDate = '-';
            var resourceUrl = 'https://trakt.tv/shows/' + showName + '/seasons/';

            if (resourceType === 'episodes' && resource.title !== null) {
                resourceTitle = resource.title;
                resourceUrl += resource.season + '/episodes/'+ resource.number;
            } else {
                resourceTitle = 'Season ' + resource.number;
                resourceUrl += resource.number;
            }

            if (resource.first_aired !== null) {
                formattedDate = new Date(resource.first_aired).toDateString();
            }

            jQuery('#missingEpisodes .title').text(resources.length + ' ' + type + ' ' + resourceType.charAt(0).toUpperCase() + resourceType.slice(1));

            var modalBody = '<a target="_blank" href="' + resourceUrl + '"><div class="missing-tile"><div class="missing-aired">' + formattedDate + '</div></div><div class="missing-title">' + resourceTitle + '</div>';

            if (resourceType === 'episodes') {
                modalBody += '<div class="missing-number">Episode ' + resource.number +'</div>';
            }

            jQuery('#missingEpisodes .modal-body').append(modalBody + '</a>');
        });
    }

};
var openModal = function() {
    jQuery('#missingEpisodes').show();
};

var closeModal = function() {
    jQuery('#missingEpisodes').hide();
};