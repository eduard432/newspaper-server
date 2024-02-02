import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'

export const listImages = async (client: S3Client, date: string): Promise<string[]> => {
	try {
		const command = new ListObjectsV2Command({
			Bucket: process.env.AWS_BUCKET_NAME || '',
			Delimiter: `${date}.webp`,
		})
		const res = await client.send(command)
		if (res.$metadata.httpStatusCode === 200) {
			const keys: string[] = []
			res.CommonPrefixes?.forEach((prefix) => prefix.Prefix && keys.push(prefix.Prefix))
			return keys
		} else return []
	} catch (error) {
		if (error instanceof Error) console.log(error.message)
        console.log(error)
		return []
	}
}
