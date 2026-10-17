/**
 * CONGLOMERADO — Bancos de nomes brasileiros para NPCs familiares
 */
(function (global) {
  'use strict';

  const FIRST_M = [
    'João', 'Pedro', 'Lucas', 'Gabriel', 'Mateus', 'Rafael', 'Bruno', 'Felipe', 'André', 'Carlos',
    'Ricardo', 'Eduardo', 'Fernando', 'Marcos', 'Paulo', 'Thiago', 'Rodrigo', 'Leonardo', 'Gustavo', 'Diego',
    'Antônio', 'José', 'Francisco', 'Luiz', 'Henrique', 'Vitor', 'Daniel', 'Alexandre', 'Marcelo', 'Renato',
    'Otávio', 'Caio', 'Igor', 'Murilo', 'Samuel', 'Enzo', 'Nicolas', 'Arthur', 'Bernardo', 'Heitor'
  ];

  const FIRST_F = [
    'Maria', 'Ana', 'Julia', 'Beatriz', 'Larissa', 'Camila', 'Fernanda', 'Patricia', 'Amanda', 'Bruna',
    'Carolina', 'Isabela', 'Letícia', 'Mariana', 'Natália', 'Paula', 'Renata', 'Sandra', 'Tatiana', 'Vanessa',
    'Adriana', 'Cláudia', 'Daniela', 'Elaine', 'Fabiana', 'Gabriela', 'Helena', 'Ingrid', 'Jéssica', 'Karina',
    'Laura', 'Mônica', 'Nicole', 'Olivia', 'Priscila', 'Raquel', 'Sofia', 'Teresa', 'Úrsula', 'Viviane'
  ];

  const SURNAMES = [
    'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
    'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa',
    'Rocha', 'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas',
    'Cardoso', 'Ramos', 'Gonçalves', 'Santana', 'Teixeira', 'Araújo', 'Melo', 'Cavalcanti', 'Pinto', 'Correia',
    'Campagnoli', 'Moraes', 'Azevedo', 'Cunha', 'Duarte', 'Farias', 'Batista', 'Campos', 'Reis', 'Monteiro'
  ];

  const PROFESSIONS = [
    'Professor(a)', 'Comerciante', 'Motorista', 'Servidor(a) público(a)', 'Autônomo(a)', 'Aposentado(a)',
    'Enfermeiro(a)', 'Técnico(a)', 'Agricultor(a)', 'Vendedor(a)', 'Contador(a)', 'Advogado(a)',
    'Engenheiro(a)', 'Médico(a)', 'Empresário(a)', 'Pedreiro(a)', 'Cozinheiro(a)', 'Segurança',
    'Analista', 'Gerente', 'Bancário(a)', 'Motorista de aplicativo', 'Costureiro(a)', 'Eletricista'
  ];

  global.CGL = global.CGL || {};
  global.CGL.Data = global.CGL.Data || {};
  global.CGL.Data.names = { FIRST_M, FIRST_F, SURNAMES, PROFESSIONS };
})(typeof window !== 'undefined' ? window : globalThis);
