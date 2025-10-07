import express from 'express';
import handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import { fileURLToPath} from 'url';
import { readFile } from 'fs/promises';
import path from 'path';
import { conexion } from './db/conexion.js';

// instancia express
const app = express();

// las solicitus con un body las interpretamos como JSON
app.use(express.json());

// ruta del estado de api, sería como ver si esta activa la aplicación
app.get('/estado', (req, res) => {
    res.json({'ok':true});    
})

// ruta tipo POST, por ahora recibe datos, la completaremos con el envio de un correo electrónico
app.post('/notificacion', async (req, res) => {

    if(!req.body.fecha ||  !req.body.salon || !req.body.turno || !req.body.correoDestino){
        res.status(400).send({'estado':false, 'mensaje':'Faltan datos requeridos!'});
    }
    
    try{
        // obtengo los datos del cuerpo de la consulta, desestructurando
        const { fecha, salon, turno, correoDestino} = req.body;

        // necesito la ubicación de la plantilla, obtengo la ruta absoluta del archivo
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);        
        const plantilla = path.join(__dirname, 'utiles', 'handlebars', 'plantilla.hbs');

        // leo la plantilla handlebars, compilo y le paso los datos que llegaron
        const archivoHbs = await readFile(plantilla, 'utf-8');

        const template = handlebars.compile(archivoHbs);

        var html = template(
            {   fecha: fecha, 
                salon: salon,
                turno: turno
            }
        );
        

        // servicio, usuario y password para el envio de correo electrónico
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.USER,
                pass: process.env.PASS,
            },
        });

        // las opciones para el envio, importante "html" (handlebars)
        const opciones = {
            to: correoDestino,
            subject: 'Notificación',
            html: html
        }

        // envío el correo electrónico
        transporter.sendMail(opciones, (error, info) => {
            if(error){
                res.json({'ok':false, 'mensaje':'Error al enviar el correo.'});           
            }
            res.json({'ok': true, 'mensaje': 'Correo enviado.'});
        });

    }catch (error){
        console.log(error);
    }
})

// ruta  GET para obtener todos los salones
app.get('/salones', async(req, res) => {
    try {
        const sql = 'SELECT * FROM salones WHERE activo = 1';
        const [results, fields] = await conexion.query(sql);


        res.json({'ok':true, 'salones':results});

    } catch (err) {
        console.log(err);
    }
})

// ruta GET para obtener 1 salon, recibe como parametro el id del salon que quiere consultar el cliente
app.get('/salones/:salon_id', async(req, res) => {
    try {
        
        const salon_id = req.params.salon_id;
        const sql = `SELECT * FROM salones WHERE activo = 1 and salon_id = ?`  ;
        const valores = [salon_id];
        const [results, fields] = await conexion.query(sql, valores);

        if(results.length === 0){
            return res.status(404).json({
                estado:false,
                mensaje:'Salon no encontrado'
            });
        }

        res.json({estado:true, salon:results});
    } catch (err) {
        console.log('error en metodo GET /salones/:salon_id', err);
        res.status(500).json({
        estado:false,
        mensaje:'Error en el servidor'});
    }
})

app.post('/salones', async(req, res) => {
    try {   
        const { titulo, direccion, capacidad, importe } = req.body;
        
        if(!titulo || !direccion || !capacidad || !importe){
            return res.status(400).json({
                estado: false,
                mensaje: 'Faltan datos requeridos'
            });
        }

        // SQL para insertar el nuevo salón
        const sql = 'INSERT INTO salones (titulo, direccion, capacidad, importe) VALUES (?, ?, ?, ?)';
        const valores = [titulo, direccion, capacidad, importe];
        
        const result=conexion.execute(sql, valores);
        console.log(result);

        res.status(201).json({
            estado: true,
            mensaje: 'Salón creado exitosamente',
            salon_id: result.insertId
        });

    } catch (err) {
        console.log('error en metodo POST /salones', err);
        res.status(500).json({
            estado: false,
            mensaje: 'Error en el servidor'
        });
    }
});

app.put('/salones/:salon_id', async(req, res) => {
    try {
        const salon_id = req.params.salon_id;
        
        // ✅ AGREGAR ESTA LÍNEA - extraer datos del body
        const { titulo, direccion, capacidad, importe } = req.body;
        
        // Verificar que exista el salón
        const sql = `SELECT * FROM salones WHERE activo = 1 and salon_id = ?`;
        const [results] = await conexion.query(sql, [salon_id]);

        if(results.length === 0){
            return res.status(404).json({
                estado: false,
                mensaje: 'El salon no existe'
            });
        }

        // Validar datos requeridos
        if(!titulo || !direccion || !capacidad || !importe){
            return res.status(400).json({
                estado: false,
                mensaje: 'Faltan datos requeridos'
            });
        }

        // ✅ CAMBIAR: usar execute() consistentemente
        const sql2 = 'UPDATE salones SET titulo=?, direccion=?, capacidad=?, importe=? WHERE salon_id=?';
        const valores = [titulo, direccion, capacidad, importe, salon_id];
        
        const [result] = await conexion.execute(sql2, valores);
        
        res.status(200).json({
            estado: true,
            mensaje: 'Salón modificado exitosamente'
        });

    } catch (err) {
        console.log('error en metodo PUT /salones/:salon_id', err);
        res.status(500).json({    
            estado: false,
            mensaje: 'Error en el servidor'
        });
    }
});




app.delete('/salones/:salon_id', async(req, res) => {
    try {
        const salon_id = req.params.salon_id;
        
        
        // Verificar que exista el salón
        const sql = `SELECT * FROM salones WHERE activo = 1 and salon_id = ?`;
        const [results] = await conexion.query(sql, [salon_id]);

        if(results.length === 0){
            return res.status(404).json({
                estado: false,
                mensaje: 'El salon no existe'
            });
        }

        const sql2 = 'UPDATE salones SET activo=0 WHERE salon_id=?';        
        const [result] = await conexion.execute(sql2, [salon_id]);
        
        res.status(200).json({
            estado: true,
            mensaje: 'Salón eliminado exitosamente'
        });

    } catch (err) {
        console.log('error en metodo DELETE /salones/:salon_id', err);
        res.status(500).json({    
            estado: false,
            mensaje: 'Error en el servidor'
        });
    }
});

       

// cargo las variables de entorno
process.loadEnvFile();

// lanzo mi servidor express
app.listen(process.env.PUERTO, () => {
    console.log(`Servidor iniciado en ${process.env.PUERTO}`);
    
});