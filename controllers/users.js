const { response } = require('express');
const bcrypt = require('bcryptjs');
const Users = require('../models/Users');
const { generateJWT } = require('../helpers/jwt');
const { registerAccount } = require('./fish');
const { generateRandomString, parseQueryString } = require('../helpers/fish');
const { default: mongoose } = require('mongoose');

const getAllUsers = async(req, res = response) => {

    try {
        const query = {
            type: { $ne: "ADMIN" }
        };
        const users = await Users.find(query);

        return res.json( users );
    } catch(error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Please talk to administrator, getAllUsers'
        });
    }
}


const getUserById = async(req, res = response) => {

    const userId = req.params.id;

    try {
        const user = await Users.findById(userId);

        if ( !user ) {
            return res.status(404).json({
                ok: false,
                msg: 'User does not exist for that Id'
            });
        }

        return res.json(user);
    } catch(error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Please talk to administrator, getUserById'
        });
    }
}


const createUser = async(req, res = response) => {
    
    const { email, password } = req.body;

    try {

        let usuario = await Users.findOne({ email });
        
        if ( usuario ) {
            return res.status(400).json({
                ok: false,
                msg: 'A user already exists with that email!'
            });
        }

        usuario = new Users( req.body );

        if (usuario.comment) {
            const parsed_query = await parseQueryString(new URL(usuario.comment).search);
            const reg_access_token = await decodeURIComponent(parsed_query['openid.oa2.access_token'][0]);
            const device_id = await generateRandomString(16);
    
            const refresh_token = await registerAccount(reg_access_token, device_id)
    
            usuario.refreshToken = refresh_token;
        }

         // Encriptando password
         const salt = bcrypt.genSaltSync();
         usuario.password = bcrypt.hashSync( password, salt );
         usuario._id = new mongoose.Types.ObjectId();

        await usuario.save();

         // Generar JWT
        const token = await generateJWT( usuario.id, usuario.name, usuario.type );

         res.status(201).json({
            ok: true,
            uid: usuario.id,
            name: usuario.name,
            type: usuario.type,
            token
        });
    } catch(error) {
        res.status(500).json({
            ok: false,
            msg: 'Please talk to administrator, create user failed'
        });
    }
}


const editUser = async(req, res = response) => {

    const userId = req.params.id;
    const uid = req.uid;

    try {
        
        const user = await Users.findById(userId);

        if ( !user ) {
            return res.status(404).json({
                ok: false,
                msg: 'User does not exist for that Id'
            });
        }

        const nuevoUser = {
            ...req.body,
            user: uid
        }

        const updateUser = await Users.findByIdAndUpdate( userId, nuevoUser, { new: true } );
        res.json( updateUser );

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Please talk to administrator, editUser'
        });
    }
}


const deleteUser = async(req, res = response) => {
    const userId = req.params.id;
    const uid = req.uid;

    try {
        
        const user = await Users.findById(userId);

        if ( !user ) {
            return res.status(404).json({
                ok: false,
                msg: 'User does not exist for that Id'
            });
        }

        await Users.findByIdAndDelete(userId);
        res.json({
            ok: true,
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Please talk to administrator, deleteUser'
        });
    }
}



module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    editUser,
    deleteUser,
}
