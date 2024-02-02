import sharp from 'sharp'
import newsPapers from './newsPapersConsts'
import { NewsPapersList } from './types'
import { GetObjectCommand, PutObjectCommand, PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3'

export const getDate = (altDate: Date = new Date(), isFilePath = false) => {
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

	const date = [year, month, day].join(!isFilePath ? '' : '-')
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
		if (newsPaper === 'excelsior') throw new Error('newsPaper excelsior not supported')
		const fileName = `${newsPaper} - ${getDate(altDate, true)}.webp`
		const exists = await existsImage(client, fileName)
		if (exists) return fileName
		const imageBuffer = await getImage(newsPaper, altDate)
		if (imageBuffer) await loadImage(client, fileName, imageBuffer)
		return fileName
	} catch (error) {
		if (error instanceof Error) console.log(error.message)
		return null
	}
}
