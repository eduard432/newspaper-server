import { convert } from 'pdf-img-convert'
import { DateTime } from 'luxon'
import { ListBlobResultBlob, list, put } from '@vercel/blob'
import { NewsPapersList } from './types'
import { RequestHandler } from 'express'
import newsPapers from './newsPapersConsts'
import sharp from 'sharp'

const existsCover = async (newsPaper: NewsPapersList, date: DateTime): Promise<ListBlobResultBlob> => {
	// Ex. 2024-02-15
	const dateString = date.toFormat('yyyy-LL-dd')

	const pathName = `${dateString}/${newsPaper} - ${dateString}`

	const resp = await list({ prefix: pathName })
	return resp.blobs[0]
}

// Generate scrapping url, default width is set to 1752
const getScrappingUrl = (newsPaper: NewsPapersList, date: DateTime, width: number = 1752): string => {
	const newsPaperInfo = newsPapers[newsPaper]
	const maxWidth = newsPaperInfo.maxWidth ? newsPaperInfo.maxWidth : 1752
	if (width > maxWidth) {
		console.log('Width set to: ' + maxWidth)
		width = maxWidth
	}

	const url = `https://t.prcdn.co/img?file=${newsPaperInfo.urlCode}${date.toFormat(
		'yyyyLLdd'
	)}00000000001001&page=1&width=${width}`
	return url
}

const scrapCover = async (newsPaper: NewsPapersList, date: DateTime): Promise<Buffer | null> => {
	const url = getScrappingUrl(newsPaper, date)
	const resp = await fetch(url)
	const contentType = resp.headers.get('Content-Type')

	if (contentType !== 'image/png') {
		console.log('Error in fetch... not a image/png')
		return null
	}

	if (resp.ok) {
		const arrayBuffer = await resp.arrayBuffer()
		const pngBuffer = Buffer.from(arrayBuffer)
		const webpBuffer = await sharp(pngBuffer).webp().toBuffer()
		return webpBuffer
	} else return null
}

const scrapPDFCover = async (url: string): Promise<Buffer | null> => {
	const pdfArray = await convert(url, { scale: 2, page_numbers: [1] }).catch(() => null)
	if (pdfArray === null) return null
	const imageBufferPng = Buffer.from(pdfArray[0])
	const imageBuffer = await sharp(imageBufferPng).webp().toBuffer()
	return imageBuffer
}

const scrapExcelsiorCover = (date: DateTime) =>
	scrapPDFCover(`https://cdn2.excelsior.com.mx/Periodico/flip-nacional/${date.toFormat('dd-LL-yyyy')}/portada.pdf`)

const scrappElPais = (date: DateTime) =>
	scrapPDFCover(
		`https://srv00.epimg.net/pdf/elpais/1aPagina/${date.year}/${date.toFormat('LL')}/ep-${date.toFormat(
			'yyyyLLdd'
		)}.pdf`
	)


export const handleScrapeCover: RequestHandler<{}, {}, {}, { newsPaper: NewsPapersList; date: string }> = async (
	req,
	res
) => {
	try {
		const { newsPaper, date: dateString } = req.query
		// Exists data?
		if (!newsPaper)
			return res
				.json({
					ok: false,
					message: 'Missing data...',
				})
				.status(400)

		// Is a valid newsPaper?
		if (!Object.keys(newsPapers).includes(newsPaper))
			return res
				.json({
					ok: false,
					message: 'Invalid Newspaper',
				})
				.status(400)

		let date: DateTime

		if (dateString === 'now') date = DateTime.local().setZone('UTC-6')
		else date = DateTime.fromFormat(dateString, 'dd-LL-yyyy')

		// Is a valid Date?
		if (!date.isValid)
			return res
				.json({
					ok: false,
					message: 'Invalid date',
				})
				.status(400)

		const exists = await existsCover(newsPaper, date)

		if (exists) {
			console.log('exists cover')
			return res.json({
				ok: true,
				data: exists,
			})
		} else {
			let imageBuffer: Buffer | null
			switch (newsPaper) {
				case 'excelsior':
					imageBuffer = await scrapExcelsiorCover(date)
					break

				case 'el_pais':
					imageBuffer = await scrappElPais(date)
					break

				default:
					imageBuffer = await scrapCover(newsPaper, date)
					break
			}
			const dateString = date.toFormat('yyyy-LL-dd')
			const uploadPathName = `${dateString}/${newsPaper} - ${dateString}.webp`
			if (!imageBuffer)
				return res
					.json({
						ok: false,
						message: 'Image not found.',
					})
					.status(404)
			const resp = await put(uploadPathName, imageBuffer, {
				access: 'public',
			})

			return res.json({
				ok: true,
				data: resp,
			})
		}
	} catch (error) {
		if (error instanceof Error) {
			console.log({ error: error.message })
		}

		return res
			.json({
				ok: false,
				error: 'Error',
			})
			.status(500)
	}
}
