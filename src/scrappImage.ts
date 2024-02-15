import { GetObjectCommand, PutObjectCommand, PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3'
import { NewsPapersList } from './types'
import newsPapers from './newsPapersConsts'
import sharp from 'sharp'
import pdfConverter from 'pdf-img-convert'

const getMonthString = (date = new Date()): string => {
	let month: number | string = date.getMonth() + 1
	const dayNumber = new Number(month).valueOf()
	if (dayNumber < 10) {
		month = '0' + month
	}
	return `${month}`
}

export const getDate = (altDate: Date = new Date(), isFilePath = false, isExcelsior = false) => {
	let day: number | string = altDate.getDate()
	let month: number | string = altDate.getMonth() + 1
	let year = altDate.getFullYear()
	const dayNumber = new Number(day).valueOf()
	const monthNumber = new Number(month).valueOf()

	if (dayNumber < 10) {
		day = '0' + day
	}

	if (monthNumber < 10) {
		month = '0' + month
	}

	const date = (!isExcelsior ? [year, month, day] : [day, month, year]).join(!isFilePath ? '' : '-')
	return date
}

export const getUrl = (newsPaper: NewsPapersList, date: Date = new Date(), width: number = 1752): string => {
	const newsPaperInfo = newsPapers[newsPaper]
	const maxWidth = newsPaperInfo.maxWidth ? newsPaperInfo.maxWidth : 1752
	if (width > maxWidth) {
		console.log('Width set to: ' + maxWidth)
		width = maxWidth
	}

	const url = `https://t.prcdn.co/img?file=${newsPaperInfo.urlCode}${getDate(date)}00000000001001&page=1&width=${width}`
	return url
}

export const getImage = async (newsPaper: NewsPapersList, date: Date = new Date()): Promise<Buffer | undefined> => {
	try {
		const url = getUrl(newsPaper, date)
		const resp = await fetch(url)
		if (resp.ok) {
			const arrayBuffer = await resp.arrayBuffer()
			const pngBuffer = Buffer.from(arrayBuffer)
			const webpBuffer = await sharp(pngBuffer).webp().toBuffer()
			return webpBuffer
		} else {
			throw new Error(`Error in fetch: ${resp.statusText}`)
		}
	} catch (error) {
		if (error instanceof Error) console.log({ newsPaper, error: error.message })
	}
}

export const getImageExcelsior = async (date = new Date()): Promise<Buffer | undefined> => {
	const dateString = getDate(date, true, true)
	const url = `https://cdn2.excelsior.com.mx/Periodico/flip-nacional/${dateString}/portada.pdf`
	const pdfArray = await pdfConverter.convert(url, { scale: 2, page_numbers: [1] })
	const imageBufferPng = Buffer.from(pdfArray[0])
	const imageBuffer = await sharp(imageBufferPng).webp().toBuffer()
	return imageBuffer
}

export const getImageElPais = async (date = new Date()): Promise<Buffer | undefined> => {
	const dateString = getDate(date, false)
	const url = `https://srv00.epimg.net/pdf/elpais/1aPagina/${date.getFullYear()}/${getMonthString(
		date
	)}/ep-${dateString}.pdf`
	const pdfArray = await pdfConverter.convert(url, { scale: 2, page_numbers: [1] })
	const imageBufferPng = Buffer.from(pdfArray[0])
	const imageBuffer = await sharp(imageBufferPng).webp().toBuffer()
	return imageBuffer
}

export const loadImage = async (client: S3Client, fileName: string, file: Buffer): Promise<void> => {
	try {
		const bucketName = process.env.AWS_BUCKET_NAME || ''

		const uploadParams: PutObjectCommandInput = {
			Bucket: bucketName,
			Key: fileName,
			Body: file,
		}
		const command = new PutObjectCommand(uploadParams)
		const result = await client.send(command)
		if (result.$metadata.httpStatusCode === 200) console.log(`${fileName} uploaded to: ${bucketName}`)
		else throw new Error('Error uploading file')
	} catch (error) {
		if (error instanceof Error) console.log(error.message)
	}
}

export const downLoadImage = async (client: S3Client, path: string) => {
	try {
		const command = new GetObjectCommand({
			Bucket: process.env.AWS_BUCKET_NAME || '',
			Key: path,
		})
		const resp = await client.send(command).catch((err) => err instanceof Error && err.name === 'NoSuckKey' && null)
		if (!resp) return null
		const array = await resp.Body?.transformToByteArray()
		if (!array) throw Error()

		return array
	} catch (error) {
		if (error instanceof Error) {
			console.log(error.message)
		}
		return null
	}
}

export const existsImage = async (client: S3Client, fileName: string): Promise<boolean> => {
	try {
		const command = new GetObjectCommand({
			Bucket: process.env.AWS_BUCKET_NAME || '',
			Key: fileName,
		})
		const resp = await client.send(command).catch((err) => err instanceof Error && err.name === 'NoSuckKey' && null)

		return !!resp
	} catch (error) {
		if (error instanceof Error) console.log(error.message)
		return false
	}
}

export const scrappImage = async (
	client: S3Client,
	newsPaper: NewsPapersList,
	altDate = new Date()
): Promise<string | null> => {
	try {
		// if (newsPaper === 'excelsior') throw new Error('newsPaper excelsior not supported')
		const fileName = `${newsPaper} - ${getDate(altDate, true)}.webp`
		const exists = await existsImage(client, fileName)
		if (exists) return fileName
		let imageBuffer: Buffer | undefined
		if (newsPaper === 'excelsior') {
			imageBuffer = await getImageExcelsior(altDate)
		} else if(newsPaper === 'el_pais') {
			imageBuffer = await getImageElPais(altDate)
		} else {
			imageBuffer = await getImage(newsPaper, altDate)
		}
		if (imageBuffer) await loadImage(client, fileName, imageBuffer)
		return fileName
	} catch (error) {
		if (error instanceof Error) console.log(error.message)
		return null
	}
}
