import fs from 'fs/promises'

export const rmRecursive = async (dirPath: string): Promise<boolean> => {
	const dir = await fs.readdir(dirPath, {
		recursive: true,
	})

	if (dir.length === 0 || !dir) return false

	for (let i = 0; i < dir.length; i++) {
		const fileName = dir[i]
		if (!fileName.includes('.')) continue
		await fs.rm(`${dirPath}/${fileName}`)
	}
	return true
}

export const getLastValidDate = (date = new Date()): Date => {
	const dayOfWeek = date.getDay()
	const day = date.getDate()

	if (dayOfWeek === 6) date.setDate(day - 1)
	else if (dayOfWeek === 0) date.setDate(day - 2)

	return date
}

export const isValidDate = (date: Date): boolean => new Date().getTime() - date.getTime() > 0
