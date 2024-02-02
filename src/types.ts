export type NewsPapersList =
	| 'milenio'
	| 'el_universal'
	| 'la_jornada'
	| 'el_mundo'
	| 'el_financiero'
	| 'el_economista'
	| 'el_sol_de_mexico'
	| 'excelsior'

export type NewsPapersMap = { [NEWSPAPER in NewsPapersList]: NewsPaperData }

export type NewsPaperData = {
	urlCode: string
	maxWidth?: number
}