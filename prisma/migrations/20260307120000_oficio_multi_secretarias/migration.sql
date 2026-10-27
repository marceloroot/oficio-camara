-- Create many-to-many join table between Oficio and Secretaria
CREATE TABLE `_OficioToSecretaria` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,
    UNIQUE INDEX `_OficioToSecretaria_AB_unique`(`A`, `B`),
    INDEX `_OficioToSecretaria_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Preserve existing associations from Oficio.secretariaId
INSERT INTO `_OficioToSecretaria` (`A`, `B`)
SELECT `id`, `secretariaId`
FROM `Oficio`
WHERE `secretariaId` IS NOT NULL;

-- Add foreign keys for join table
ALTER TABLE `_OficioToSecretaria`
    ADD CONSTRAINT `_OficioToSecretaria_A_fkey`
    FOREIGN KEY (`A`) REFERENCES `Oficio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `_OficioToSecretaria`
    ADD CONSTRAINT `_OficioToSecretaria_B_fkey`
    FOREIGN KEY (`B`) REFERENCES `Secretaria`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove old one-to-many relation
ALTER TABLE `Oficio` DROP FOREIGN KEY `Oficio_secretariaId_fkey`;
ALTER TABLE `Oficio` DROP COLUMN `secretariaId`;
