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
