<template>
    <div class="modal-card" style="width: auto">
        <header class="modal-card-head">
            <p class="modal-card-title">Export</p>
            <button class="delete" aria-label="close" @click="$emit('close')" />
        </header>

        <section class="modal-card-body content" style="text-align: left">
            <template>
                <article class="message is-info">
                    <div class="message-body">
                        Un avis sur cette nouvelle fenêtre d'export ? Des propositions d'amélioration ? Écrire à
                        <a href="mailto:dev@aktivisda.earth">dev@aktivisda.earth</a>.
                    </div>
                </article>

                <b-tabs style="width: min(1000px, 100vw)">
                    <b-tab-item label="PDF" icon="printer">
                        <h3><b-icon icon="printer"></b-icon>Exporter pdf</h3>
                        <article>
                            Parfait pour <b>imprimer des affiches</b>. Le texte n'est jamais pixelisé, quelque soit la taille de l'affiche : A4, A3 ou
                            même A0 !
                        </article>
                        <article class="message is-warning">
                            <div class="message-body">
                                Votre visuel contient un ou plusieurs éléments non supportés sur l'export pdf. L'affiche téléchargée sur votre
                                ordinateur risque d'être un peu différente. Vous avez besoin de ces fonctionnalités ? Écrivez à
                                <a href="mailto:dev@aktivisda.earth">dev@aktivisda.earth</a> et ces fonctionnalités seront ajoutées.
                            </div>
                        </article>
                        <b-button size="is-medium" type="is-primary" expanded>Exporter en PDF</b-button>
                    </b-tab-item>
                    <b-tab-item label="JPEG" icon="camera">
                        <h3><b-icon icon="camera"></b-icon>Exporter en JPEG</h3>
                        <div class="columns">
                            <div class="column">
                                <p>
                                    Le format jpeg est parfaitement adapté si votre visuel contient des<b>pour les photos</b>. Le fichier exporté est
                                    compressé pour être le plus léger possible. Vous pouvez choisir la qualité : 100 si pas de compression, 0 pour une
                                    compression très importante. La valeur de <b>75 est recommandé.</b>
                                </p>
                                <article class="message is-primary">
                                    <div class="message-body">Votre visuels contient une ou plusieurs photos. L'export JPEG est recommandé.</div>
                                </article>
                            </div>
                            <div class="column">
                                <b-numberinput :min="1"></b-numberinput>
                                <div style="margin: 12px; width: 100%; height: 1px"></div>
                                <b-numberinput :min="1"></b-numberinput>
                                <div style="margin: 12px; width: 100%; height: 1px"></div>

                                <number-picker :min="0" :max="100" :prepend="$t('COMMON.TOP')" :append="$t('COMMON.BOTTOM')" />
                                <div style="margin: 12px; width: 100%; height: 1px"></div>

                                <b-button size="is-medium" expanded type="is-primary"> Exporter en JPEG </b-button>
                            </div>
                        </div>
                    </b-tab-item>
                    <b-tab-item label="PNG" icon="drawing-box">
                        <h3><b-icon icon="drawing-box"></b-icon>Exporter en PNG</h3>
                        <p>Le format png est le plus adapté pour utiliser le visuel sur les réseaux sociaux</p>
                        <hr class="is-medium" />
                        <b-button size="is-small" expanded>Exporter en PNG</b-button>
                    </b-tab-item>
                    <b-tab-item label="Template" icon="content-save">
                        <h3><b-icon icon="content-save"></b-icon>Sauvegarder le fichier modifiable</h3>
                        <p>
                            <b>Enregistrer pour plus tard ?</b> Parfait pour avoir des visuels de très bonne qualité fidèles aux couleurs. Mais c'est
                            un peu lourd, pour le moment.
                        </p>
                        <b-button size="is-small" expanded>Exporter le modèle</b-button>
                    </b-tab-item>
                </b-tabs>
            </template>
        </section>
    </div>
</template>

<script>
import NumberPicker from '@/components/pickers/NumberPicker.vue';

export default {
    name: 'exportmodal',
    components: { NumberPicker },
    props: {},
    data: () => ({}),
    computed: {},
};
</script>

<style lang="scss"></style>
