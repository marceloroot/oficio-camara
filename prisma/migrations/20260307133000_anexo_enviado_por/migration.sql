ALTER TABLE `Anexo`
    ADD COLUMN `enviadoPorId` VARCHAR(191) NULL;

CREATE INDEX `Anexo_enviadoPorId_idx` ON `Anexo`(`enviadoPorId`);

ALTER TABLE `Anexo`
    ADD CONSTRAINT `Anexo_enviadoPorId_fkey`
    FOREIGN KEY (`enviadoPorId`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
