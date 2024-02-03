import { S3Client } from '@aws-sdk/client-s3'
import cors from 'cors'
import express, { Handler, type Express, ErrorRequestHandler } from 'express'
import favicon from 'serve-favicon'
import fs from 'fs/promises'
import morgan from 'morgan'
import path from 'path'

const NODE_ENV = process.env.NODE_ENV

export default class App {
	private expressApp: Express

	constructor() {
		this.expressApp = express()
	}

	public async listen(port: number, callback?: () => void) {
		this.expressApp.disable('x-powered-by')
		this.expressApp.listen(port, callback)
		this.expressApp.use(express.json(), cors(), morgan('dev'))

		const pathDir = path.join(NODE_ENV !== 'production' ? process.cwd() : __dirname, 'web')
		console.log({ pathDir })
		this.expressApp.use(express.static(pathDir))
		this.expressApp.use(favicon(path.join(pathDir, 'favicon.ico')))
		this.expressApp.get('/', (req, res) => res.sendFile(path.join(pathDir, 'index.html')))

		return this.expressApp
	}

	public getS3Client() {
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

	public async startCache() {
		const dir = await fs.readdir('./cache').catch(() => null)
		if (!dir) fs.mkdir('./cache')
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
