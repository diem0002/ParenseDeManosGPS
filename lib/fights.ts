export interface Fight {
    id: string;
    fighterA: string;
    fighterB: string;
    time: string; // e.g. "00:30 HS"
}

export const FIGHTS: Fight[] = [
    { id: 'f1', time: '18:00 HS', fighterA: 'Monzon', fighterB: 'Bonavena' },
    { id: 'f2', time: '18:30 HS', fighterA: 'Vigna', fighterB: 'Viciconte' },
    { id: 'f3', time: '19:20 HS', fighterA: 'Perez', fighterB: 'Jove' },
    { id: 'f4', time: '19:50 HS', fighterA: 'Dairi', fighterB: 'Espe' },
    { id: 'f5', time: '20:30 HS', fighterA: 'Gabino', fighterB: 'Banks' },
    { id: 'f6', time: '21:00 HS', fighterA: 'Coty', fighterB: 'Carito' },
    { id: 'f7', time: '21:50 HS', fighterA: 'Mernuel', fighterB: 'Cosmic Kid' },
    { id: 'f8', time: '22:20 HS', fighterA: 'Grego', fighterB: 'Goncho' },
    { id: 'f9', time: '23:10 HS', fighterA: 'Perxitaa', fighterB: 'Coker' },
    { id: 'f10', time: '23:50 HS', fighterA: 'Pepi', fighterB: 'Maravilla' },
    { id: 'f11', time: '00:30 HS', fighterA: 'Gero', fighterB: 'Mazza' },
];
