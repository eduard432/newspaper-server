import express, { Handler, type Express, ErrorRequestHandler } from 'express'
import morgan from 'morgan'
import cors from 'cors'
import path from 'path'
import fs from 'fs/promises'
import { S3Client } from '@aws-sdk/client-s3'

export default class App {
	private expressApp: Express

	constructor () {
		this.expressApp = express()
	}

	public async listen(port: number, callback?: () => void) {
		this.expressApp.disable('x-powered-by')
		this.expressApp.listen(port, callback)
		this.expressApp.use(express.json(), cors(), morgan('dev'))

		return this.expressApp
	}
    
    public getS3Client () {
        const bucketName = process.env.AWS_BUCKET_NAME || ''
		const region = process.env.AWS_BUCKET_REGION || ''
		const accessKeyId = process.env.AWS_S3_ACCESS_KEY || ''
		const secretAccessKey = process.env.AWS_S3_SECRET_KEY || ''

		if (!bucketName && !region && !accessKeyId && !secretAccessKey) throw Error('Insuficent env')
		return new S3Client({
			region: region,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
		})
    }

	public async startCache () {
		const dir = await fs.readdir('./cache').catch(() => null)
		if(!dir) fs.mkdir('./cache')
	}

	public notFoundHandler: Handler = (req, res, next) => {
		res.status(404).send({ error: 404, message: 'Rout not found' })
	}

	public errorHandler: ErrorRequestHandler = (err, req, res, next) => {
		if (err instanceof Error) {
			console.log(err.name)
			res.status(500).send({ error: 500, message: 'Server Error, try again later...' })
		}
	}
}
