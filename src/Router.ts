import { downLoadImage, getDate, scrappImage } from './scrappImage'
import { listImages } from './getData'
import { NewsPapersList } from './types'
import { RequestHandler } from 'express'
import { S3Client } from '@aws-sdk/client-s3'
import fs from 'fs/promises'
import newsPapers from './newsPapersConsts'
import { getLastValidDate, rmRecursive } from './helpers'

export const handlerWithS3Client = (client: S3Client) => {
	const handleGetImage: RequestHandler<{ fileName: string }> = async (req, res) => {
		try {
			const { fileName } = req.params
			if (!fileName)
				return res
					.json({
						ok: false,
						error: 'Filename missing',
					})
					.status(400)

			const localFile = await fs.readFile(`./cache/${fileName}`).catch(() => null)

			if (!localFile) {
				const imageArrayBuffer = await downLoadImage(client, fileName)
				if (!imageArrayBuffer) {
					return res
						.json({
							ok: false,
							error: 'Not Found',
						})
						.status(404)
				} else {
					const imageBuffer = Buffer.from(imageArrayBuffer)
					await fs.writeFile(`./cache/${fileName}`, imageBuffer)
					return res.type('image/webp').send(imageBuffer)
				}
			} else {
				return res.type('image/webp').send(localFile).status(304)
			}
		} catch (error) {
			if (error instanceof Error) {
				console.log(error.message)
			}
			return res.status(500).send({ error: 500, message: 'Server Error, try again later...' })
		}
	}

	const handleListImages: RequestHandler<{ date: string | 'latest' }> = async (req, res) => {
		try {
			let { date } = req.params
			if (!date)
				return res
					.json({
						ok: false,
						error: 'Filename missing',
					})
					.status(400)

			if(date === 'latest'){
				date = getDate(getLastValidDate(), true)
			}

			const keys = await listImages(client, date)
			return res.json({
				ok: true,
				data: {
					queryDate: date,
					images: keys,
				},
			})
		} catch (error) {
			if (error instanceof Error) {
				console.log(error.message)
			}
			return res.status(500).send({ error: 500, message: 'Server Error, try again later...' })
		}
	}

	const handleScrappImage: RequestHandler<{}, {}, {}, { newsPaper: NewsPapersList; date: string }> = async (
		req,
		res
	) => {
		const { newsPaper, date: dateString } = req.query
		if (!newsPaper || !dateString) {
			return res
				.json({
					ok: false,
					error: 'Missing data...',
				})
				.status(400)
		} else if (!Object.keys(newsPapers).includes(newsPaper)) {
			return res
				.json({
					ok: false,
					error: 'Invalid newspaper...',
				})
				.status(403)
		}
		const fileName = await scrappImage(client, newsPaper, new Date(dateString.replace('-', '/')))
		if (!fileName)
			return res
				.json({
					ok: false,
					error: 'Not Found',
				})
				.status(404)
		else
			return res.json({
				ok: true,
				url: `${req.get('host')}/api/images/${fileName}`,
			})
	}

	return { handleGetImage, handleListImages, handleScrappImage }
}

export const handleListNewsPaper: RequestHandler = (req, res) => {
	return res.json({
		ok: true,
		newsPapers: Object.keys(newsPapers),
	})
}

export const handleClearCache: RequestHandler = async (req, res) => {
	try {
		const result = await rmRecursive('./cache')
		return res.json({
			ok: result,
			message: result ? 'Cache cleaned' : 'Cache is alredy empty',
		})
	} catch (error) {
		if (error instanceof Error) console.log(error.message)
		return res
			.json({
				ok: false,
				message: 'Error cleaning cache',
			})
			.status(500)
	}
}

export const handleHealthCheck: RequestHandler = (req, res) => {
	return res.status(200).json({ ok: true, status: 'Healthy' })
}
