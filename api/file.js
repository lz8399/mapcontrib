
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import express from 'express';
import multer from 'multer';
import logger from '../lib/logger';
import config from 'config';
import { basename } from '../public/js/core/utils';


const publicDirectory = path.resolve(__dirname, '..', 'public');
const uploadDirectory = path.resolve(__dirname, '..', 'upload');

let options = {
    CONST: undefined,
    database: undefined,
};


function setOptions(hash) {
    options = hash;
}


function initDirectories(app) {
    if ( !fs.existsSync( config.get('dataDirectory') ) ) {
        mkdirp.sync(config.get('dataDirectory'));
    }

    if ( !fs.existsSync( uploadDirectory ) ) {
        mkdirp.sync(uploadDirectory);
    }

    app.use(
        express.static( publicDirectory )
    );
    app.use(
        '/files',
        express.static( config.get('dataDirectory') )
    );
    app.use(
        multer({ dest: uploadDirectory })
    );
}


function cleanThemeFiles(themeModel) {
    const fragment = themeModel.get('fragment');
    const layers = themeModel.get('layers').models;
    const shapeDirectory = path.resolve(
        publicDirectory,
        `files/theme/${fragment}/shape/`
    );
    const re = new RegExp(`^/files/theme/${fragment}/shape/`);
    const themeFiles = [];

    for (const i in layers) {
        if ({}.hasOwnProperty.call(layers, i)) {
            const fileUri = layers[i].get('fileUri');

            if ( fileUri && re.test(fileUri) ) {
                themeFiles.push(
                    basename(fileUri)
                );
            }
        }
    }

    fs.readdir(shapeDirectory, (err, fileList) => {
        if (err) {
            logger.error(err);
        }

        for (const i in fileList) {
            if ({}.hasOwnProperty.call(fileList, i)) {
                const file = fileList[i];
                const filePath = path.resolve(shapeDirectory, file);

                if ( themeFiles.indexOf(file) === -1 ) {
                    fs.unlink(filePath);
                }
            }
        }
    });
}


function uploadFile(req, res, file, directory) {
    file.originalname = file.originalname.toLowerCase();

    let i = 2;
    let publicPath = `/files/${directory}/${file.originalname}`;
    const fullDirectory = `${config.get('dataDirectory')}/${directory}`;
    let fullPath = `${fullDirectory}/${file.originalname}`;

    if ( !fs.existsSync( fullDirectory ) ) {
        mkdirp.sync( fullDirectory );
    }

    while (fs.existsSync(fullPath) === true) {
        const baseName = path.basename(
            file.originalname,
            `.${file.extension}`
        );
        const fileName = `${baseName}_${i}.${file.extension}`;

        publicPath = `/files/${directory}/${fileName}`;
        fullPath = `${fullDirectory}/${fileName}`;
        i += 1;
    }

    return new Promise((resolve, reject) => {
        fs.rename(
            file.path,
            fullPath,
            (err) => {
                if (err) {
                    logger.error(err);
                    return reject(err);
                }

                const result = {};
                result[file.fieldname] = publicPath;
                return resolve(result);
            }
        );
    });
}


class Api {
    static postShapeFile(req, res) {
        const fragment = req.query.fragment;
        const promises = [];

        for (const field in req.files) {
            if ({}.hasOwnProperty.call(req.files, field)) {
                const file = req.files[field];
                const fileSize = file.size / 1024;
                const maxFileSize = config.get('client.uploadMaxShapeFileSize');

                if ( fileSize > maxFileSize) {
                    return res.sendStatus(413);
                }

                const extension = file.extension.toLowerCase();

                if ( options.CONST.shapeFileExtensions.indexOf(extension) === -1 ) {
                    return res.sendStatus(415);
                }

                promises.push(
                    uploadFile(req, res, req.files[field], `theme/${fragment}/shape`)
                );
            }
        }

        return Promise.all(promises)
        .then((results) => {
            res.send(results);
        })
        .catch(() => {
            res.sendStatus(500);
        });
    }

    static postNonOsmDataFile(req, res) {
        const fragment = req.query.fragment;
        const promises = [];

        for (const field in req.files) {
            if ({}.hasOwnProperty.call(req.files, field)) {
                const file = req.files[field];
                const fileSize = file.size / 1024;
                const maxFileSize = config.get('client.uploadMaxNonOsmDataFileSize');

                if ( fileSize > maxFileSize) {
                    return res.status(413).send({ fileInput: field });
                }

                promises.push(
                    uploadFile(req, res, req.files[field], `theme/${fragment}/nonOsmData`)
                );
            }
        }

        return Promise.all(promises)
        .then((results) => {
            res.send(results);
        })
        .catch(() => {
            res.sendStatus(500);
        });
    }
}


export default {
    setOptions,
    initDirectories,
    cleanThemeFiles,
    Api,
};
