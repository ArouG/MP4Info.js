/**
 * MP4Info 
 *
 * v 1.1   2016/04/08
 *
 *       Inspirations :
 *
 *              https://github.com/lennart/mp4   (about tags like id3 tags in MP4 file)
 *              https://github.com/gpac/mp4box.js    (Cocorocooooo !!) Try : http://download.tsi.telecom-paristech.fr/gpac/mp4box.js/filereader.html
 */
"use strict";

var mp4 = function(opts, cb) {
    var info = {};
    var options = {
        type: 'uri',
    };
    if (typeof opts === 'string') {
        opts = {
            file: opts,
            type: 'uri'
        };
    } else 
    /******************************************************************************************************
               Can't be good for workers : they don't know anything about window !!
    if (typeof window !== 'undefined' && window.File && opts instanceof window.File)
    ********************************************************************************************************/
            {
        opts = {
            file: opts,
            type: 'file'
        };
        info.filesize = opts.file.size;
        info.filename = opts.file.name;
        info.filedate = opts.file.lastModified;
    }
    for (var k in opts) {
        options[k] = opts[k];
    }

    if (!options.file) {
        return cb('No file was set');
    }

    /******************************************************************************************************
               Can't be good for workers : they don't know anything about window !!
    if (options.type === 'file') {
        if (typeof window === 'undefined' || !window.File || !window.FileReader || typeof ArrayBuffer === 'undefined') {
            return cb('Browser does not have support for the File API and/or ArrayBuffers');
        }
    } else if (options.type === 'local') {
        if (typeof require !== 'function') {
            return cb('Local paths may not be read within a browser');
        }
        var fs = require('fs');
    } else {} /* Buffer Utitlities */
    /******************************************************************************************************/

    var MP4Tag = {};
    MP4Tag.parse = function(handle, callback) {
            /********************************************** that was a pretty good idea ... Helas ! See down
            Array.prototype.max = function() {
                return Math.max.apply(null, this);
            };

            Array.prototype.min = function() {
                return Math.min.apply(null, this);
            }
            ***********************************************************************************************/

            var containers = [
                "moov", "udta", "mdia", "meta", "ilst",
                "stbl", "minf", "moof", "traf", "trak",
                "stsd" //, "dinf", "edts"                  // OK on se moque bien des enfants de dinf et de edts ! Don't bother of thses two boxes (dinf & edts)
            ];
            var CodVideo = ["mp4v", "avc1", "avc2", "avc3", "avc4", "avcp", "drac", "encv", "mjp2", "mvc1", "mvc2", "resv", "s263", "svc1", "vc-1", "hvc1", "hev1"];
            var CodAudio = ["mp4a", "ac-3", "alac", "dra1", "dtsc", "dtse", , "dtsh", "dtsl", "ec-3", "enca", "g719", "g726", "m4ae", "mlpa", "raw ", "samr", "sawb", "sawp", "sevc", "sqcp", "ssmv", "twos", ".mp3"];
            var CodHint = ["fdp ", "m2ts", "pm2t", "prtp", "rm2t", "rrtp", "rsrp", "rtp ", "sm2t", "srtp"];
            var CodMdata = ["metx", "mett", "urim"];
            var CodSubts = ["stpp", "wvtt", "sbtt", "tx3g", "stxt"];
            var CodSyst = ["mp4s"];
            var CodMenu = ["text"];
            var atoms;
            var moovatom;

            function readAtom(offset, ascendance, Boxes, cb) {
                var offsetCur, myBoxeCur, ascendance;

                function alldauthersclosed() {
                    if (Boxes[0].children.length == 0) {
                        return false;
                    } else {
                        var close = true;
                        for (var u = 0; u < Boxes[0].children.length; u++) {
                            if (!Boxes[0].children[u].Cld) {
                                close = false;
                                break;
                            }
                        }
                        return close;
                    }
                }

                function common(myBoxe,Boxes,buffer,ascendance, cb){
                    var BoxeMere = Boxes[0];
                    for (var k = 1; k < ascendance.length; k++) {
                        BoxeMere = BoxeMere.children[ascendance[k]];
                    }
                    myBoxe.Ind = BoxeMere.children.length;
                    BoxeMere.children.push(myBoxe);
                    BoxeMere.Nxt = BoxeMere.Nxt + myBoxe.length;
                    if (containers.indexOf(myBoxe.name) != -1) {
                        // this atom is Container We looking for a daughter
                        // cet atome / boite en contient d'autres : recherchons une première fille
                        myBoxe.Nxt = myBoxe.offset + 8;
                        if (myBoxe.name == "stsd") {
                            myBoxe.Nxt += 8;
                        }
                        if (myBoxe.name == 'meta') {
                            myBoxe.Nxt += 4;
                        }
                        myBoxe.children = [];
                        myBoxe.Cld = false;
                        ascendance.push(myBoxe.Ind);
                        // So ... read first daughter
                        // Allons-y pour la lecture de la première fille !
                        readAtom(myBoxe.Nxt, ascendance, Boxes, function(err, Boxes) {
                            if (err) {
                                cb(err);
                            } else {
                                cb(null, Boxes);
                            }
                        });
                    } else {
                        // myBoxe isn't a container so, it cannot be a mother 
                        // myBoxe ne peut être un container ? Alors elle ne peut être mère et avoir des filles
                        myBoxe.Cld = true;

                        // prochaine mère ? Une soeur est-elle possible ?
                        //  looking for a new "mother" with potentially new daughters !
                        while (BoxeMere.Nxt > BoxeMere.offset + BoxeMere.length - 1) {
                            // The 'mother' can't have another daughter So myBoxe is my "mother" :)
                            myBoxe.Cld = true;
                            myBoxe = BoxeMere;
                            ascendance.pop();
                            var BoxeMere = Boxes[0];
                            for (var k = 1; k < ascendance.length; k++) {
                                BoxeMere = BoxeMere.children[ascendance[k]];
                            }
                            //if all daughters of "OldMammy" have not new daughter then all family is complete !
                            if (alldauthersclosed()) {
                                Boxes[0].BoxesAreRead = true;
                                break; // sortie de la boucle
                            }
                        }
                        // cherchons une soeur de myBoxe (donc myBoxe ne peut plus avoir de nouvelles filles)
                        //  looking for a sister of myBoxe (So myBoxe can't have new daughter !)
                        if (Boxes[0].BoxesAreRead) {
                            cb(null, Boxes); // exit of readAtom
                        } else {
                            myBoxe.Cld = true;
                            readAtom(myBoxe.offset + myBoxe.length, ascendance, Boxes, function(err, Boxes) {
                                if (err) {
                                    cb(err);
                                } else {
                                    cb(null, Boxes);
                                }
                            });
                        }
                    }
                }

                if (!cb) {
                    cb = Boxes;
                    Boxes = [];
                    var mere = {};
                    mere.name = "OldMammy";
                    mere.offset = 0;
                    mere.length = info.filesize;
                    mere.Nxt = 0;
                    mere.Cld = false;
                    mere.children = [];
                    mere.Ind = 0;
                    mere.BoxesAreRead = false;
                    Boxes.push(mere);
                }

                offsetCur = offset;
                handle.read(8, offset, function(err, buffer) {
                    if (err) {
                        cb(err);
                    } else {
                        var myBoxe = {};
                        var dv = new DataView(buffer);
                        myBoxe.length = dv.getUint32(0, false);
                        myBoxe.offset = offset;
                        var id = [];
                        for (var i = 4; i < 8; i++) {
                            id.push(String.fromCharCode(dv.getUint8(i)));
                        }
                        myBoxe.name = id.join("");
                        myBoxeCur = myBoxe;
                        // Pay ATTENTION ! if length==1 then real length is more than 32 SO real length is on 8 bytes just after the atom name
                        // ATTENTION !!! si la longueur lue avant le nom de la boite est égale = 1 (normalement >=8), la véritable longueur se lit sur les 8 octets situés après le nom !
                        if (myBoxe.length == 1) {
                            offsetCur += 8;
                            handle.read(8, offsetCur, function(err, buffer) {
                                if (err) {
                                    cb(err);
                                } else {
                                    myBoxe = myBoxeCur;
                                    var dv = new DataView(buffer);
                                    myBoxe.length = (dv.getUint32(0, false) << 32) + dv.getUint32(4, false);

                                    common(myBoxe,Boxes,buffer, ascendance, cb);
                                } // pas d'erreur sur lecture des 8 prochains octets   
                            }); // handle.read fin 
                        } else {
                            common(myBoxe,Boxes,buffer, ascendance, cb);    
                        }
                    }
                });
            }

            function elngparse(ind, offset, nbB, ncb) { // offset = offset de tkhd
                if (info.tracks[ind].iselng) {
                    handle.read(nbB - 8, offset + 8, function(err, buffer) {
                        if (err) {
                            cb(err);
                        } else {
                            var dv = new DataView(buffer);
                            var id = [];
                            for (var i = 0; i < nbB - 8; i++) {
                                id.push(String.fromCharCode(dv.getUint8(i)));
                            }
                            info.tracks[ind].elngLangage = id.join("");
                            if (ind < info.tracks.length - 1) {
                                ind++;
                                elngparse(ind, info.tracks[ind].elngOff, info.tracks[ind].elngLen, ncb);
                            } else {
                                ncb(null, info);
                            }
                        }
                    });
                } else {
                    if (ind < info.tracks.length - 1) {
                        ind++;
                        elngparse(ind, info.tracks[ind].elngOff, info.tracks[ind].elngLen, ncb);
                    } else {
                        ncb(null, info);
                    }
                }
            }

            function mdhdparse(ind, offset, nbB, ncb) { // offset = offset de tkhd
                if (info.tracks[ind].ismdhd) {
                    handle.read(nbB - 8, offset + 8, function(err, buffer) {
                        if (err) {
                            cb(err);
                        } else {
                            var dv = new DataView(buffer);
                            var tmp;
                            info.tracks[ind].mdhdvers = dv.getInt8(0);
                            if (info.tracks[ind].mdhdvers == 1) {
                                info.tracks[ind].mdhdTimescale = dv.getUint32(20, false);
                                info.tracks[ind].mdhdDuration = dv.getUint32(24, false) << 32 + dv.getUint32(28, false);
                                tmp = dv.getUint16(32, false);
                            } else {
                                info.tracks[ind].mdhdTimescale = dv.getUint32(12, false);
                                info.tracks[ind].mdhdDuration = dv.getUint32(16, false);
                                tmp = dv.getUint16(20, false);
                            }
                            var chars = [];
                            chars[0] = (tmp >> 10) & 0x1F;
                            chars[1] = (tmp >> 5) & 0x1F;
                            chars[2] = (tmp) & 0x1F;
                            info.tracks[ind].mdhdLangage = String.fromCharCode(chars[0] + 0x60, chars[1] + 0x60, chars[2] + 0x60);

                            if (ind < info.tracks.length - 1) {
                                ind++;
                                mdhdparse(ind, info.tracks[ind].mdhdOff, info.tracks[ind].mdhdLen, ncb);
                            } else {
                                elngparse(0, info.tracks[0].elngOff, info.tracks[0].elngLen, function(err, info) {
                                    if (err) {
                                        cb(err);
                                    } else {
                                        ncb(null, info);
                                    }
                                });
                            }
                        }
                    });
                } else {
                    if (ind < info.tracks.length - 1) {
                        ind++;
                        mdhdparse(ind, info.tracks[ind].mdhdOff, info.tracks[ind].mdhdLen, ncb);
                    } else {
                        elngparse(info.tracks[0].elngOff, info.tracks[0].elngLen, function(err, info) {
                            if (err) {
                                cb(err);
                            } else {
                                ncb(null, info);
                            }
                        });
                    }
                }
            }

            function tkhdparse(ind, offset, nbB, ncb) { // offset = offset de tkhd
                if (info.tracks[ind].istkhd) {
                    handle.read(nbB - 8, offset + 8, function(err, buffer) {
                        if (err) {
                            cb(err);
                        } else {
                            var dv = new DataView(buffer);
                            info.tracks[ind].tkhdvers = dv.getInt8(0);
                            if (info.tracks[ind].tkhdvers == 1) {
                                info.tracks[ind].IdTtrack = dv.getUint32(20, false);
                                info.tracks[ind].duration = dv.getUint32(32, false) << 32 + dv.getUint32(36, false);
                                info.tracks[ind].Trackwidth = dv.getUint32(92, false) / (1 << 16);
                                info.tracks[ind].Trackheight = dv.getUint32(96, false) / (1 << 16);
                            } else {
                                info.tracks[ind].IdTtrack = dv.getUint32(12, false);
                                info.tracks[ind].duration = dv.getUint32(20, false);
                                info.tracks[ind].Trackwidth = dv.getUint32(76, false) / (1 << 16);
                                info.tracks[ind].Trackheight = dv.getUint32(80, false) / (1 << 16);
                            }
                            if (ind < info.tracks.length - 1) {
                                ind++;
                                tkhdparse(ind, info.tracks[ind].tkhdOff, info.tracks[ind].tkhdLen, ncb);
                            } else {
                                ncb(null, info);
                            }
                        }
                    });
                } else {
                    if (ind < info.tracks.length - 1) {
                        ind++;
                        tkhdparse(ind, info.tracks[ind].tkhdOff, info.tracks[ind].kthdLen, ncb);
                    } else {
                        ncb(null, info);
                    }
                }
            }

            function stszparse(ind, offset, nbB, ncb) { // offset = offset de tkhd
                if (info.tracks[ind].isstsz) {
                    handle.read(nbB - 8, offset + 8, function(err, buffer) {
                        if (err) {
                            cb(err);
                        } else {
                            var dv = new DataView(buffer);
                            info.tracks[ind].stszvers = dv.getInt8(0);
                            if (info.tracks[ind].stszvers == 1) {
                                info.tracks[ind].sample_size = -1;
                                info.tracks[ind].sample_count = 0;
                                info.tracks[ind].size = 0;
                            } else {
                                info.tracks[ind].sample_size = dv.getUint32(4, false);
                                info.tracks[ind].sample_count = dv.getUint32(8, false);
                                if (info.tracks[ind].sample_size == 0) {
                                    info.tracks[ind].size = 0;
                                    for (var k = 0; k < info.tracks[ind].sample_count; k++) info.tracks[ind].size += dv.getUint32(12 + (k * 4), false);
                                } else {
                                    info.tracks[ind].size = info.tracks[ind].sample_count * info.tracks[ind].sample_size;
                                }
                            }
                            if (ind < info.tracks.length - 1) {
                                ind++;
                                stszparse(ind, info.tracks[ind].stszOff, info.tracks[ind].stszLen, ncb);
                            } else {
                                ncb(null, info);
                            }
                        }
                    });
                } else {
                    if (ind < info.tracks.length - 1) {
                        ind++;
                        stszparse(ind, info.tracks[ind].stszOff, info.tracks[ind].stszLen, ncb);
                    } else {
                        ncb(null, info);
                    }
                }
            }

            function visualEntry(buffer, offset, NbB, info) {
                var hd_size = 8; // length + type (normal)
                var pos = offset + hd_size + 16; // loop 16 bytes (avc1 au moins !)
                info.width = buffer.getUint16(pos, false);
                pos += 2;
                info.height = buffer.getUint16(pos, false);
                pos += 2;
                info.PixelHresolution = buffer.getUint32(pos, false) >> 16;
                pos += 4;
                info.PixelVresolution = buffer.getUint32(pos, false) >> 16;
                pos += 4;
                info.DataSize = buffer.getUint32(pos, false);
                pos += 4; // ???
                info.FramesCount = buffer.getUint16(pos, false);
                pos += 2;
                var long = buffer.getUint8(pos, false);
                pos += 1;
                var id = [];
                for (var i = 0; i < long; i++) {
                    id.push(String.fromCharCode(buffer.getUint8(pos + i)));
                }
                info.Compressor = id.join("");
                pos += 31; // longueur réservée = 32 octets
                info.depth = buffer.getUint16(pos, false);
                pos += 2;
                info.TabColId = buffer.getUint16(pos, false);
                pos += 2;
                while (pos < NbB) {
                    var size = buffer.getUint32(pos, false);
                    pos += 4;
                    var id = [];
                    for (var i = 0; i < 4; i++) {
                        id.push(String.fromCharCode(buffer.getUint8(pos + i)));
                    }
                    var type = id.join("");
                    pos += 4;
                    if (type == "pasp") { // PAR
                        info.PARh = buffer.getUint32(pos, false);
                        pos += 4;
                        info.PARv = buffer.getUint32(pos, false);
                        pos += 4;
                        pos += size - 16;
                    } else {
                        pos += size - 8;
                    }
                }
            }

            function audioEntry(buffer, offset, NbB, info) {
                var hd_size = 8;
                var pos = offset + hd_size + 8; // loop 8 bytes   (mp4a pour le moins)
                info.ChannelsCount = buffer.getUint16(pos, false);
                pos += 2;
                info.sampleNbBits = buffer.getUint16(pos, false);
                pos += 2;
                info.compressionId = buffer.getUint16(pos, false);
                pos += 2;
                info.packetSize = buffer.getUint16(pos, false);
                pos += 2;
                info.sampleRate = buffer.getUint32(pos, false) / (1 << 16);
                pos += 4;
                while (pos < NbB) {
                    var size = buffer.getUint32(pos, false);
                    pos += 4;
                    var id = [];
                    for (var i = 0; i < 4; i++) {
                        id.push(String.fromCharCode(buffer.getUint8(pos + i)));
                    }
                    var type = id.join("");
                    pos += 4;
                    pos += size - 8;
                }
            }

            function stsdparse(ind, offset, nbB, ncb) {
                if (info.tracks[ind].isstsd) {
                    handle.read(nbB - 8, offset + 8, function(err, buffer) {
                        if (err) {
                            cb(err);
                        } else {
                            var dv = new DataView(buffer);
                            var indEntry;
                            var Entry = [];
                            var entryinfo = {};
                            info.tracks[ind].stsdNbEntry = dv.getUint32(4, false);
                            var bufferpos = 8;
                            for (indEntry = 0; indEntry < info.tracks[ind].stsdNbEntry; indEntry++) {
                                entryinfo.length = dv.getUint32(bufferpos, false);
                                bufferpos += 4;
                                var id = [];
                                for (var i = 0; i < 4; i++) {
                                    id.push(String.fromCharCode(dv.getUint8(bufferpos + i)));
                                }
                                entryinfo.type = id.join("");
                                bufferpos += 4; // théoriquement, Entry==1 => entryinfo.type=codec
                                if (CodVideo.indexOf(entryinfo.type) > -1) {
                                    visualEntry(dv, bufferpos, entryinfo.length, entryinfo);
                                } else {
                                    if (CodAudio.indexOf(entryinfo.type) > -1) {
                                        audioEntry(dv, bufferpos, entryinfo.length, entryinfo);
                                    } else {
                                        // ne traite pas pour l'instant ! I don't know :)
                                    }
                                }
                                Entry.push(entryinfo);
                                bufferpos = bufferpos - 8 + entryinfo.length;
                            }
                            info.tracks[ind].Entry = Entry;
                            if (ind < info.tracks.length - 1) {
                                ind++;
                                stsdparse(ind, info.tracks[ind].stsdOff, info.tracks[ind].stsdLen, ncb);
                            } else {
                                ncb(null, info);
                            }
                        }
                    });
                } else {
                    if (ind < info.tracks.length - 1) {
                        ind++;
                        stsdparse(ind, info.tracks[ind].stsdOff, info.tracks[ind].stsdLen, ncb);
                    } else {
                        ncb(null, info);
                    }
                }
            }

            function sttsparse(ind, offset, nbB, ncb) {
                if (info.tracks[ind].isstts && info.tracks[ind].typeTrack == 'Video') { // pour le framerate seulement ! 
                    handle.read(nbB - 8, offset + 8, function(err, buffer) {
                        if (err) {
                            cb(err);
                        } else {
                            var dv = new DataView(buffer);
                            info.tracks[ind].sttsvers = dv.getInt8(0);
                            if (info.tracks[ind].sttsvers == 0) {
                                var nbentry = dv.getUint32(4, false);
                                var Delta = [];
                                var Count = [];
                                for (var k = 0; k < nbentry; k++) {
                                    Count.push(dv.getUint32(8 * (k + 1), false));
                                    Delta.push(dv.getUint32(8 * (k + 1) + 4, false));
                                }
                                /*
                                Maximum call stack size exceeded !!! Sometimes oldest scripts have some good ^^ 
                                var Deltamin = Math.min.apply(null, Delta);
                                var Deltamax = Math.max.apply(null, Delta);
                                */
                                var Deltamax = 0; 
                                for (var k=0; k<Delta.length; k++){
                                    if (Delta[k]>Deltamax) Deltamax=Delta[k];
                                }
                                var Deltamin = Deltamax;
                                for (var k=0; k<Delta.length; k++){
                                    if (Delta[k]<Deltamin) Deltamin=Delta[k];
                                }

                                if (Deltamin != Deltamax) {
                                    info.tracks[ind].brmin = {};
                                    info.tracks[ind].brmax = {};
                                    var Countmin = 0;
                                    var idx = Delta.indexOf(Deltamin);
                                    while (idx != -1) {
                                        Countmin += Count[idx];
                                        idx = Delta.indexOf(Deltamin, idx + 1);
                                    }
                                    var Countmax = 0;
                                    var idx = Delta.indexOf(Deltamax);
                                    while (idx != -1) {
                                        Countmax += Count[idx];
                                        idx = Delta.indexOf(Deltamax, idx + 1);
                                    }
                                    info.tracks[ind].brmin.Count = Countmin;
                                    info.tracks[ind].brmin.Val = Deltamin;
                                    info.tracks[ind].brmax.Count = Countmax;
                                    info.tracks[ind].brmax.Val = Deltamax;
                                }
                            }
                            if (ind < info.tracks.length - 1) {
                                ind++;
                                sttsparse(ind, info.tracks[ind].sttsOff, info.tracks[ind].sttsLen, ncb);
                            } else {
                                ncb(null, info);
                            }
                        }
                    });
                } else {
                    if (ind < info.tracks.length - 1) {
                        ind++;
                        sttsparse(ind, info.tracks[ind].sttsOff, info.tracks[ind].sttsLen, ncb);
                    } else {
                        ncb(null, info);
                    }
                }
            }

            function _tooparse(offset, nbB, ncb) {
                if (info.is_too) {
                    handle.read(nbB - 8, offset + 8, function(err, buffer) {
                        if (err) {
                            cb(err);
                        } else {
                            var dv = new DataView(buffer);
                            var pos = 0;

                            var Lsize = dv.getUint32(pos, false);
                            var id = [];
                            for (var i = 0; i < 4; i++) {
                                id.push(String.fromCharCode(dv.getUint8(pos + 4 + i)));
                            }
                            var Ltype = id.join("");
                            while ((Ltype !== "data") && (pos + Lsize < nbB - 7)) {
                                pos += Lsize;
                                Lsize = dv.getUint32(pos, false);
                                id = [];
                                for (var i = 0; i < 4; i++) {
                                    id.push(String.fromCharCode(dv.getUint8(pos + 4 + i)));
                                }
                                Ltype = id.join("");
                            }
                            if (Ltype == 'data') {
                                id = [];
                                for (var i = pos + 16; i < pos + Lsize; i++) {
                                    id.push(String.fromCharCode(dv.getUint8(i)));
                                }
                                info.author = id.join("");
                                ncb(null, info);
                            }

                        }
                    });
                } else {
                    ncb(null, info);
                }
            }

            function ftypparse(offset, nbB, ncb) {
                info.ftyp = {};
                info.ftyp.offset = offset;
                info.ftyp.datalength = nbB;
                handle.read(nbB - 8, offset + 8, function(err, buffer) {
                    if (err) {
                        ncb(err);
                    } else {
                        var dv = new DataView(buffer);
                        var id = [];
                        for (var i = 0; i < 4; i++) {
                            id.push(String.fromCharCode(dv.getUint8(i)));
                        }
                        info.major_brand = id.join("");
                        info.minor_version = dv.getUint32(4, false);
                        info.compatible_brands = [];
                        for (var k = 8; k < info.ftyp.datalength - 8; k += 4) {
                            var id = [];
                            for (var i = 0; i < 4; i++) {
                                id.push(String.fromCharCode(dv.getUint8(k + i)));
                            }
                            info.compatible_brands.push(id.join(""));
                        }
                        ncb(null, info);
                    }
                });
            }

            function mvhdparse(offset, nbB, ncb) {
                info.mvhd = {};
                info.mvhd.offset = offset;
                info.mvhd.datalength = nbB;
                handle.read(nbB - 8, offset + 8, function(err, buffer) {
                    if (err) {
                        cb(err);
                    } else {
                        var dv = new DataView(buffer);
                        info.mvhd.version = dv.getInt8(0);
                        if (info.mvhd.version == 1) {
                            info.mvhd.creation_time = dv.getUint32(4, false) << 32 + dv.getUint32(8, false);
                            info.mvhd.modification_time = dv.getUint32(12, false) << 32 + dv.getUint32(16, false);
                            info.mvhd.timescale = dv.getUint32(20, false);
                            info.mvhd.duration = dv.getUint32(24, false) << 32 + dv.getUint32(28, false);;
                        } else {
                            info.mvhd.creation_time = dv.getUint32(4, false);
                            info.mvhd.modification_time = dv.getUint32(8, false);
                            info.mvhd.timescale = dv.getUint32(12, false);
                            info.mvhd.duration = dv.getUint32(16, false);
                        }
                        info.dureeS = info.mvhd.duration / info.mvhd.timescale;
                        var pos = info.mvhd.datalength - 12;
                        info.mvhd.nextTrackId = dv.getUint32(pos, false);
                        ncb(null, info);
                    }
                });
            }

            function infoUpdateTracks(){
                info.tracks = [];
                moovatom = atoms[info.Ismoov];
                for (var i = 0; i < moovatom.children.length; i++) {
                    if (moovatom.children[i].name == "mvhd") info.Ismvhd = i;
                    if (moovatom.children[i].name == "mvex") { // if Ismvex > -1 alors le MP4 est dit fragmenté 
                        info.Ismvex = i;
                        var mvexatom = moovatom.children[i];
                        for (var j = 0; j < mvexatom.children.length; j++) {
                            if (mvexatom.children[j].name == "mehd") {
                                info.ismehd = true;
                                info.mehdOff = mvexatom.children[j].offset;
                                info.mehdLen = mvexatom.children[j].length;
                            }
                        }
                    }
                    info.is_too = false;
                    info._tooOff = null;
                    info._tooLen = 0;
                    if (moovatom.children[i].name == "udta") {
                        var udtaatom = moovatom.children[i];
                        for (var j = 0; j < udtaatom.children.length; j++) {
                            if (udtaatom.children[j].name == "meta") {
                                var metaatom = udtaatom.children[j];
                                for (var k = 0; k < metaatom.children.length; k++) {
                                    if (metaatom.children[k].name == 'ilst') {
                                        var ilstatom = metaatom.children[k];
                                        for (var l = 0; l < ilstatom.children.length; l++) {
                                            if (ilstatom.children[l].name == '©too') {
                                                info.is_too = true;
                                                info._tooOff = ilstatom.children[l].offset;
                                                info._tooLen = ilstatom.children[l].length;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (moovatom.children[i].name == "trak") {
                        var tmp = {};
                        tmp.ind = i;
                        tmp.istkhd = false;
                        tmp.ismdia = false;
                        tmp.isminf = false;
                        tmp.isstbl = false;
                        tmp.isstsd = false;
                        tmp.isstsz = false;
                        tmp.isstz2 = false;
                        tmp.ismdhd = false;
                        tmp.iselng = false;
                        tmp.isstts = false;
                        tmp.mdiaOff = null;
                        tmp.mdiaLen = 0;
                        tmp.minfOff = null;
                        tmp.minfLen = 0;
                        tmp.stblOff = null;
                        tmp.stblLen = 0;
                        tmp.stsdOff = null;
                        tmp.stsdLen = 0;
                        tmp.mdhdOff = null;
                        tmp.mdhdLen = 0;
                        tmp.sttsOff = null;
                        tmp.sttsLen = 0;
                        tmp.codec = null;
                        tmp.codecOff = null;
                        tmp.codecLen = 0;
                        tmp.tkhdOff = null;
                        tmp.tkhdLen = 0;
                        tmp.stszOff = null;
                        tmp.stszLen = 0;
                        tmp.stz2Off = null;
                        tmp.stz2Len = 0;
                        tmp.elngOff = null;
                        tmp.elngLen = 0;
                        var trackatom = moovatom.children[i];
                        for (var j = 0; j < trackatom.children.length; j++) {
                            if (trackatom.children[j].name == "tkhd") {
                                var tkhdatom = trackatom.children[j];
                                tmp.istkhd = true;
                                tmp.tkhdOff = tkhdatom.offset;
                                tmp.tkhdLen = tkhdatom.length;
                            }
                            if (trackatom.children[j].name == "mdia") {
                                tmp.ismdia = true;
                                var mdiaatom = trackatom.children[j];
                                tmp.mdiaOff = mdiaatom.offset;
                                tmp.mdiaLen = mdiaatom.length;
                                for (var l = 0; l < mdiaatom.children.length; l++) {
                                    if (mdiaatom.children[l].name == 'mdhd') { // langage
                                        tmp.ismdhd = true;
                                        var mdhdatom = mdiaatom.children[l];
                                        tmp.mdhdOff = mdhdatom.offset;
                                        tmp.mdhdLen = mdhdatom.length;
                                    }
                                    if (mdiaatom.children[l].name == 'elng') { // langage alternatif
                                        tmp.iselng = true;
                                        var elngatom = mdiaatom.children[l];
                                        tmp.elngOff = elngatom.offset;
                                        tmp.elngLen = elngatom.length;
                                    }
                                    if (mdiaatom.children[l].name == 'minf') {
                                        tmp.isminf = true;
                                        var minfatom = mdiaatom.children[l];
                                        tmp.minfOff = minfatom.offset;
                                        tmp.minfLen = minfatom.length;
                                        for (var m = 0; m < minfatom.children.length; m++) {
                                            if (minfatom.children[m].name == 'stbl') {
                                                tmp.isstbl = true;
                                                var stblatom = minfatom.children[m];
                                                tmp.stblOff = minfatom.offset;
                                                tmp.stblLen = minfatom.length;
                                                for (var n = 0; n < stblatom.children.length; n++) {
                                                    if (stblatom.children[n].name == 'stsd') { // codec
                                                        tmp.isstsd = true;
                                                        var stsdatom = stblatom.children[n];
                                                        tmp.stsdOff = stsdatom.offset;
                                                        tmp.stsdLen = stsdatom.length;
                                                        tmp.codec = stsdatom.children[0].name;
                                                        tmp.codecOff = stsdatom.children[0].offset;
                                                        tmp.codecLen = stsdatom.children[0].length;
                                                        if (CodVideo.indexOf(tmp.codec) > -1) tmp.typeTrack = 'Video';
                                                        if (CodAudio.indexOf(tmp.codec) > -1) tmp.typeTrack = 'Audio';
                                                        if (CodHint.indexOf(tmp.codec) > -1) {
                                                            tmp.typeTrack = 'Hint';
                                                            info.HintTracks = true;
                                                        }
                                                        if (CodSubts.indexOf(tmp.codec) > -1) tmp.typeTrack = 'Subtitles';
                                                        if (CodSyst.indexOf(tmp.codec) > -1) tmp.typeTrack = 'Other (subtitles idx/sub)';
                                                        if (CodMenu.indexOf(tmp.codec) > -1) tmp.typeTrack = 'Chapters/Menu';
                                                    }
                                                    if (stblatom.children[n].name == 'stsz') { // nombre de samples
                                                        tmp.isstsz = true;
                                                        var stszatom = stblatom.children[n];
                                                        tmp.stszOff = stszatom.offset;
                                                        tmp.stszLen = stszatom.length;
                                                    }
                                                    if (stblatom.children[n].name == 'stz2') { // nombre de samples Alternative
                                                        tmp.isstz2 = true;
                                                        var stz2atom = stblatom.children[n];
                                                        tmp.stz2Off = stz2atom.offset;
                                                        tmp.stz2Len = stz2atom.length;
                                                    }
                                                    if (stblatom.children[n].name == 'stts') { // nombre de samples Alternative
                                                        tmp.isstts = true;
                                                        var sttsatom = stblatom.children[n];
                                                        tmp.sttsOff = sttsatom.offset;
                                                        tmp.sttsLen = sttsatom.length;
                                                    }
                                                }
                                            }
                                        }        // minfatom.children
                                    }
                                }                // mdiaatom.children
                            }
                        }                        // trackatom.children
                        info.tracks.push(tmp);
                    }
                }     //  boucle sur les moovatom.children
            }

            readAtom(0, [0], function(err, Boxes) {
                if (!err) {
                    atoms = [];
                    for (var v = 0; v < Boxes[0].children.length; v++) atoms.push(Boxes[0].children[v]);
                    Boxes[0].rappel = null;
                    //console.log(JSON.stringify(atoms));  for debugging
                    //var info={};
                    info.Ismoov = -1;
                    info.Ismdat = -1;
                    info.Isftyp = -1;
                    info.text = "";
                    /********************************************* moof, moov, mdat et hinttrack : http://www.perso.telecom-paristech.fr/~concolat/MPEGFileFormats.pdf **************************************************/
                    info.Ismoof = -1; // si présence d'une moof box, alors le MP4 devrait avoir été créé "à la volée" donc illisible dans ce cadre ! De plus on devrait trouver des trun (track fragment run)
                    info.HintTracks = false; 
                    if (atoms) {
                        for (var i = 0; i < atoms.length; i++) {
                            if (atoms[i].name == "ftyp") info.Isftyp = i;
                            if (atoms[i].name == "mdat") info.Ismdat = i;
                            if (atoms[i].name == "moov") info.Ismoov = i;
                            if (atoms[i].name == "moof") info.Ismoof = i;
                        }
                        info.progressive = false;
                        if (info.Ismoov > -1 && info.Ismoov < info.Ismdat) {
                            info.progressive = true;
                        }
                        if (info.Isftyp > -1) {
                            // ftyp :
                            ftypparse(atoms[info.Isftyp].offset, atoms[info.Isftyp].length, function(err, buffer) {
                                if (!err) {
                                    // mvhd :
                                    info.Ismvhd = -1;
                                    info.Ismvex = -1;
                                    info.ismehd = false;
                                    info.mehdOff = null;
                                    info.mehdLen = 0;
                                    infoUpdateTracks();
                                    if (info.Ismvhd > -1) {
                                        mvhdparse(moovatom.children[info.Ismvhd].offset, moovatom.children[info.Ismvhd].length, function(err, buffer) {
                                            if (err) {
                                                cb(err);
                                            } else {
                                                // tracks
                                                tkhdparse(0, info.tracks[0].tkhdOff, info.tracks[0].tkhdLen, function(err, info) {
                                                    if (err) {
                                                        cb(err);
                                                    } else {
                                                        // détermination langages (mdhd ou elng)
                                                        mdhdparse(0, info.tracks[0].mdhdOff, info.tracks[0].mdhdLen, function(err, info) {
                                                            if (err) {
                                                                cb(err);
                                                            } else {
                                                                // détermination size nbsamples 
                                                                stszparse(0, info.tracks[0].stszOff, info.tracks[0].stszLen, function(err, info) {
                                                                    if (err) {
                                                                        cb(err);
                                                                    } else {
                                                                        // bitrate constant ou min max
                                                                        sttsparse(0, info.tracks[0].sttsOff, info.tracks[0].sttsLen, function(err, info) {
                                                                            if (err) {
                                                                                cb(err);
                                                                            } else {
                                                                                // suite   examine le CodeC !! donc stsd
                                                                                stsdparse(0, info.tracks[0].stsdOff, info.tracks[0].stsdLen, function(err, info) {
                                                                                    if (err) {
                                                                                        cb(err);
                                                                                    } else {
                                                                                        // enfin, cas du ©too :
                                                                                        _tooparse(info._tooOff, info._tooLen, function(err, info) {
                                                                                            if (err) {
                                                                                                cb(err);
                                                                                            } else {
                                                                                                handle.close(); // precaution !
                                                                                                callback(null, info); // retourne l'objet info  
                                                                                            }
                                                                                        }); // _tooparse
                                                                                    }
                                                                                }); // stsdparse
                                                                            }
                                                                        }); // sttsparse  
                                                                    }
                                                                }); // stszparse
                                                            }
                                                        }); // mdhdparse
                                                    }
                                                }); // tkhdparse 
                                            } // mvhdparse
                                        }); // mvhdparse
                                    } //    is there one mvhdbox ????
                                } //  There must be an ftyp box !
                                //   Il ne peut qu'y avoir une boite ftyp !
                                  else {
                                    cb('Error reading ftyp boxe', null);
                                }
                            }); // ftypparse
                        } else {
                            cb('Not a MP4 file',null);   // Pay attention to file with mp4 extension because mime type don't verify real type !
                        }
                    } // There must be some atoms !
                      // Il ne peut qu'y avoir des atoms ... au moins un !
                      else {
                        cb('Not a MP4 file', null);
                    }
                } // if (!err) 
                  else {
                    cb("file can't be read", null);
                }
            }); // read.Atom
        }
        /*
         * Reader.js
         * A unified reader interface for AJAX, local and File API access
         * 43081j
         * License: MIT, see LICENSE
         */
    var Reader = function(type) {
        this.type = type || Reader.OPEN_URI;
        this.size = null;
        this.file = null;
    };

    Reader.OPEN_FILE = 1;
    Reader.OPEN_URI = 2;
    Reader.OPEN_LOCAL = 3;

    if (typeof require === 'function') {
        var fs = require('fs');
    }

    Reader.prototype.open = function(file, callback) {
        this.file = file;
        var self = this;
        switch (this.type) {
            case Reader.OPEN_LOCAL:
                fs.stat(this.file, function(err, stat) {
                    if (err) {
                        return callback(err);
                    }
                    self.size = stat.size;
                    fs.open(self.file, 'r', function(err, fd) {
                        if (err) {
                            return callback(err);
                        }
                        self.fd = fd;
                        callback();
                    });
                });
                break;
            case Reader.OPEN_FILE:
                this.size = this.file.size;
                callback();
                break;
            default:
                this.ajax({
                        uri: this.file,
                        type: 'HEAD',
                    },
                    function(err, resp, xhr) {
                        if (err) {
                            return callback(err);
                        }
                        self.size = parseInt(xhr.getResponseHeader('Content-Length'));
                        callback();
                    }
                );
                break;
        }
    };

    Reader.prototype.close = function() {
        if (this.type === Reader.OPEN_LOCAL) {
            fs.close(this.fd);
        }
    };

    Reader.prototype.read = function(length, position, callback) {
        if (typeof position === 'function') {
            callback = position;
            position = 0;
        }
        if (this.type === Reader.OPEN_LOCAL) {
            this.readLocal(length, position, callback);
        } else if (this.type === Reader.OPEN_FILE) {
            this.readFile(length, position, callback);
        } else {
            this.readUri(length, position, callback);
        }
    };

    Reader.prototype.readBlob = function(length, position, type, callback) {
        if (typeof position === 'function') {
            callback = position;
            position = 0;
        } else if (typeof type === 'function') {
            callback = type;
            type = 'application/octet-stream';
        }
        this.read(length, position, function(err, data) {
            if (err) {
                callback(err);
                return;
            }
            callback(null, new Blob([data], {
                type: type
            }));
        });
    };

    /*
     * Local reader
     */
    Reader.prototype.readLocal = function(length, position, callback) {
        var buffer = new Buffer(length);
        fs.read(this.fd, buffer, 0, length, position, function(err, bytesRead, buffer) {
            if (err) {
                return callback(err);
            }
            var ab = new ArrayBuffer(buffer.length),
                view = new Uint8Array(ab);
            for (var i = 0; i < buffer.length; i++) {
                view[i] = buffer[i];
            }
            callback(null, ab);
        });
    };

    /*
     * URL reader
     */
    Reader.prototype.ajax = function(opts, callback) {
        var options = {
            type: 'GET',
            uri: null,
            responseType: 'text'
        };
        if (typeof opts === 'string') {
            opts = {
                uri: opts
            };
        }
        for (var k in opts) {
            options[k] = opts[k];
        }
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) return;
            if (xhr.status !== 200 && xhr.status !== 206) {
                return callback('Received non-200/206 response (' + xhr.status + ')');
            }
            callback(null, xhr.response, xhr);
        };
        xhr.responseType = options.responseType;
        xhr.open(options.type, options.uri, true);
        if (options.range) {
            options.range = [].concat(options.range);
            if (options.range.length === 2) {
                xhr.setRequestHeader('Range', 'bytes=' + options.range[0] + '-' + options.range[1]);
            } else {
                xhr.setRequestHeader('Range', 'bytes=' + options.range[0]);
            }
        }
        xhr.send();
    };

    Reader.prototype.readUri = function(length, position, callback) {
        this.ajax({
                uri: this.file,
                type: 'GET',
                responseType: 'arraybuffer',
                range: [position, position + length - 1]
            },
            function(err, buffer) {
                if (err) {
                    return callback(err);
                }
                return callback(null, buffer);
            }
        );
    };

    /*
     * File API reader
     */
    Reader.prototype.readFile = function(length, position, callback) {
    /*      OK in wekWorkers (OK for Chrome, Opera and IE) except Firefox  :
    /*                       http://stackoverflow.com/questions/22741478/firefox-filereader-is-not-defined-only-when-called-from-web-worker     */    
        if (typeof FileReader === 'undefined'){
            var slice = this.file.slice(position, position + length),
                fr=new FileReaderSync();
            callback(null,fr.readAsArrayBuffer(slice));
        } else {    
            var slice = this.file.slice(position, position + length),
               fr = new FileReader();
            fr.onload = function(e) {
                callback(null, e.target.result);
            };
            fr.readAsArrayBuffer(slice);
        }
    };
    /*
     * Read the file
     */

    if (typeof options.type === 'string') {
        switch (options.type) {
            case 'file':
                options.type = Reader.OPEN_FILE;
                break;
            case 'local':
                options.type = Reader.OPEN_LOCAL;
                break;
            default:
                options.type = Reader.OPEN_URI
        }
    }

    var handle = new Reader(options.type);

    handle.open(options.file, function(err) {
        if (err) {
            return cb('Could not open specified file');
        }
        MP4Tag.parse(handle, function(err, tags) {
            cb(err, tags);
        });
    });
}; // MP4Tag.parse ! ??



if (typeof module !== 'undefined' && module.exports) {
    module.exports = mp4;
} else {
    if (typeof define === 'function' && define.amd) {
        define('mp4', [], function() {
            return mp4;
        });
    } 
};
