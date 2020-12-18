importScripts('MP4Infomin.js');
// seules petites evolutions :
// prise en compte de l'indice du fichier transmis dans le message (lnum) pour pouvoir le retourner à l'appelant et
// présentation du retour : suppression des lignes "more info" pour les Codecs Audio et Video
// date : 2020/12/18


        function duree(s) {

            function onetotwo(Pint) {
                if (Pint < 10) {
                    return '0' + Pint.toString();
                } else {
                    return Pint.toString();
                }
            }

            function onetothree(Pint) {
                if (Pint < 10) {
                    return '00' + Pint.toString();
                } else {
                    if (Pint < 100) {
                        return '0' + Pint.toString();
                    } else {
                        return Pint.toString();
                    }
                }
            }

            var out = '';
            var lhh = '';
            var lmn = '';
            var lss = '';
            var lms = '';
            lhh = Math.floor(s / 3600);
            lmn = Math.floor((s - lhh * 3600) / 60);
            lss = Math.floor(s - lhh * 3600 - lmn * 60);
            lms = Math.ceil((s - lhh * 3600 - lmn * 60 - lss) * 1000);
            if (lhh > 0) {
                lhh = lhh.toString() + ":";
                out = lhh;
            }
            if (lmn > 0) {
                if (out.length == 0) {
                    out = lmn.toString() + ":";
                } else {
                    out = out + onetotwo(lmn) + ":";
                }
            } else {
                if (out.length > 0) {
                    out = out + "00:";
                }
            }
            if (lss > 0) {
                if (out.length == 0) {
                    out = lss.toString();
                } else {
                    out = out + onetotwo(lss);
                }
            } else {
                if (out.length == 0) {
                    out = "0";
                } else {
                    out = out + "00";
                }
            }
            if (lms != 0) {
                out = out + '.' + onetothree(lms);
            }
            return out;
        }

        function humanFileSize(size) {
            var i = Math.floor(Math.log(size) / Math.log(1024));
            return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['o', 'ko', 'Mo', 'Go', 'To'][i];
        };

        function humanBitrate(size) {
            var i = Math.floor(Math.log(size) / Math.log(1024));
            return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['bps', 'kbps', 'Mbps', 'Gbps', 'Tbps'][i];
        };

        function human_reading(info) {
            info.text = "ArouG's MP4 Infos :\n";
            info.text += "-------------------\n";
            info.text += "File : " + info.filename + "\n";
            var d = new Date(info.filedate);
            info.text += "Date : " + d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + d.getMinutes() + "\n";
            info.text += "Size : " + humanFileSize(info.filesize) + "\n";
            info.text += "Format : MPEG-4 \n";
            info.text += "Compatibility : " + info.major_brand;
            if (info.compatible_brands.length > 0) {
                info.text += " (" + info.compatible_brands[0];
                for (var h = 1; h < info.compatible_brands.length; h++) info.text += ',' + info.compatible_brands[h];
                info.text += ')';
            }
            info.text += "\n";
            if (info.progressive) {
                info.text += "Progressivity : Yes (streamable & probably downloaded)\n";
            } else {
                info.text += "Progressivity : No\n";
            }
            info.text += "Duration : " + duree(info.dureeS) + "\n";
            //info.text += "Width : "+
            var DataSize = 0;
            for (var i = 0; i < info.tracks.length; i++) DataSize += info.tracks[i].size;
            GlobBitrate = 8 * DataSize / info.dureeS;
            info.text += "Global bitrate : " + humanBitrate(GlobBitrate) + "\n";
            if (info.author) {
                info.text += "Creator : " + info.author + "\n";
            }
            info.text += "\n";

            for (var i = 0; i < info.tracks.length; i++) {
                info.text += info.tracks[i].typeTrack + " :\n";
                info.text += "Track number " + info.tracks[i].IdTtrack + "\n";
                info.text += "Codec : " + info.tracks[i].codec + "\n";
                info.text += "Size : " + humanFileSize(info.tracks[i].size) + "\n";
                info.text += "Count of samples : " + info.tracks[i].sample_count + "\n";
                var dureeS = info.tracks[i].mdhdDuration / info.tracks[i].mdhdTimescale;
                info.text += "Duration : " + duree(dureeS) + "\n";
                var tmp = 8 * info.tracks[i].size / dureeS;
                if ((info.tracks[i].typeTrack == 'Video') || (info.tracks[i].typeTrack == 'Audio')) {
                    info.text += "Global Bitrate : " + humanBitrate(tmp) + "\n";
                }
                info.text += "Langage : " + info.tracks[i].mdhdLangage + "\n";

                if (info.tracks[i].typeTrack == 'Video') {
                    tmp = Math.ceil(100 * info.tracks[i].sample_count / dureeS) / 100;
                    info.text += "Framerate : " + tmp + " FPS";
                    info.text += "\n";
                    if (info.tracks[i].brmin) {
                        if (info.tracks[i].brmin != info.tracks[i].brmax) {
                            fmin = Math.ceil(100 * info.tracks[i].mdhdTimescale / info.tracks[i].brmax.Val) / 100;
                            fmax = Math.ceil(100 * info.tracks[i].mdhdTimescale / info.tracks[i].brmin.Val) / 100;
                            info.text += "Framerate min : " + fmin + "  FPS (for " + info.tracks[i].brmax.Count + " frames)\n";
                            info.text += "Framerate max : " + fmax + "  FPS (for " + info.tracks[i].brmin.Count + " frames)\n";
                        }
                    }
                    info.text += "Width (on screen) : " + Math.ceil(info.tracks[i].Trackwidth) + "\n";
                    info.text += "Heidth (on screen) : " + Math.ceil(info.tracks[i].Trackheight) + "\n";
                    if (info.tracks[i].Entry) {
                        //info.text += "Codec Video more info :\n";
                        if (info.tracks[i].Entry[0].Compressor) {
                            info.text += "Compressor : " + info.tracks[i].Entry[0].Compressor + "\n";
                        }
                        info.text += "Depth (number of bits / pixel) : " + info.tracks[i].Entry[0].depth + "\n";
                        info.text += "Width (in file) : " + info.tracks[i].Entry[0].width + "\n";
                        info.text += "Heidth (in file) : " + info.tracks[i].Entry[0].height + "\n";
                        if (info.tracks[i].Entry[0].PARh) {
                            info.text += "Pixel Aspect Ratio (PAR) : " + info.tracks[i].Entry[0].PARh + "*" + info.tracks[i].Entry[0].PARv + "\n";
                        }
                    }
                }

                if (info.tracks[i].typeTrack == 'Audio') {
                    if (info.tracks[i].Entry) {
                        //info.text += "Codec Audio more info :\n";
                        if (info.tracks[i].Entry[0].Compressor) {
                            info.text += "Compressor : " + info.tracks[i].Entry[0].Compressor + "\n";
                        }
                        info.text += "Count of channels : " + info.tracks[i].Entry[0].ChannelsCount + "\n";
                        info.text += "Depth (number of bits / sample) : " + info.tracks[i].Entry[0].sampleNbBits + "\n";
                        info.text += "SampleRate : " + info.tracks[i].Entry[0].sampleRate + "\n";
                    }
                }
                info.text += "\n";
            }
            return info.text;
        }


onmessage = function(event) {

  var file = event.data[0];
  let lnum = event.data[1];
  //let mp4regex = new RegExp("(.*?)\.(mp4|m4v)$");  

    if ((file.type == 'video/mp4') || (file.type == 'video/m4v')){ 
        mp4(file, function(err, info) {
          if (err) {
            //console.log('error : ' + err);
            postMessage({
              'data' : 'error : ' + err, 
              'num' : lnum
            });
          } else {
            sortie_texte = human_reading(info);
            postMessage({
              'data' : sortie_texte,
              'num' : lnum
            });
            //console.log(sortie_texte);
          }
        });
    } else {
        postMessage({'data' : 'nop', 'num' : lnum});
    }    
  }
